import { core } from "@tago-io/tcore-sdk";
import axios, { AxiosRequestConfig } from "axios";
import { Request, Response } from "express";
import sendResponse from "../lib/sendResponse";
import { IConfigParam } from "../types";
import { getDevice } from "./uplink";

interface DownlinkBuild {
  downlink_key: string;
  port: number;
  payload: string;
  url: string;
  confirmed: boolean;
}

async function sendDownlink({ downlink_key, port, payload, url, confirmed }: DownlinkBuild) {
  const options: AxiosRequestConfig = {
    url,
    method: "post",
    headers: { Authorization: `Bearer ${downlink_key}` },
    data: {
      downlinks: [{ frm_payload: payload, f_port: port || 1, priority: "NORMAL", confirmed: confirmed || false }],
    },
  };

  await axios(options);
}

interface IDownlinkParams {
  device: string;
  payload: string;
  port: number;
  confirmed: boolean;
}
interface IClassAConfig {
  downlink_key: string;
  url: string;
}

/**
 * Send downlink to the device on TTN
 * @param config TTN configuration
 * @param req request
 * @param res request response
 * @param classAConfig optinal parameter sent by TTN for class A devices
 */
async function downlinkService(config: IConfigParam, req: Request, res: Response, classAConfig?: IClassAConfig) {
  const authorization = req.headers["Authorization"] || req.headers["authorization"];
  if (!authorization || authorization !== config.authorization_code) {
    console.error(`[Network Server] Request refused, authentication is invalid: ${authorization}`);
    return sendResponse(res, { body: "Invalid authorization header", status: 401 });
  }

  const body = <IDownlinkParams>req.body;
  const port = Number(body.port || 1);

  if (!classAConfig?.downlink_key || !classAConfig?.url) {
    const device = await getDevice(body.device);

    const [downlinkData] = await core.getBucketData(device.bucket as string, { variables: ["downlink_key"] });
    if (!downlinkData) {
      return sendResponse(res, { body: "Variable downlink_key not found in the device", status: 401 });
    }

    classAConfig = { downlink_key: downlinkData.value as string, url: (downlinkData?.metadata as any)?.url as string };
  }

  const downlinkBuild: DownlinkBuild = {
    port,
    confirmed: body.confirmed as boolean,
    downlink_key: classAConfig.downlink_key,
    payload: Buffer.from(body.payload, "hex").toString("base64"),
    url: classAConfig.url,
  };

  return sendDownlink(downlinkBuild)
    .then(() => {
      return sendResponse(res, { body: { status: true, message: "Downlink successfully sent" }, status: 201 });
    })
    .catch((e) => {
      return sendResponse(res, { body: JSON.stringify(e.response.data), status: e.response.status });
    });
}

export default downlinkService;
export { IClassAConfig };
