import { core } from "@tago-io/tcore-sdk";
import { Request, Response } from "express";
import { IConfigParam } from "../types";
import sendResponse from "../lib/sendResponse";
import parseBody from "../lib/parseBody";
import toTagoFormat from "../lib/toTagoFormat";

interface IPayloadParamsTTI {
  //TTI
  end_device_ids: {
    dev_eui: string;
    device_id: string;
    application_ids: {
      application_id: string;
    };
  };
  uplink_message: {
    f_cnt: number;
    f_port: number;
    frm_payload: string;
  };
  downlink_url?: string;
}

async function getDevice(dev_eui: string) {
  const device_list = await core.getDeviceList({
    amount: 10000,
    page: 1,
    fields: ["id", "name", "tags", "bucket"],
  });

  if (!device_list || !device_list.length) {
    throw "Authorization Denied: Device EUI doesn't match any serial tag";
  }
  const device = device_list.find((x) => x.tags.find((tag) => tag.key === "serial" && tag.value === dev_eui));
  if (!device) {
    throw "Authorization Denied: Device EUI doesn't match any serial tag";
  }

  return device;
}

async function uplinkService(config: IConfigParam, req: Request, res: Response) {
  const authorization = req.headers["Authorization"] || req.headers["authorization"];
  if (!authorization || authorization !== config.authorization_code) {
    console.error(`[Network Server] Request refused, authentication is invalid: ${authorization}`);
    return sendResponse(res, { body: "Invalid authorization header", status: 401 });
  }

  const data: IPayloadParamsTTI = parseBody(req);
  if (!data.end_device_ids) {
    console.error(`[Network Server] Request refused, body is invalid`);
    return sendResponse(res, { body: "Invalid body received", status: 401 });
  }

  const { dev_eui, application_ids, device_id } = data.end_device_ids;
  const device = await getDevice(dev_eui).catch((e) => {
    return sendResponse(res, { body: e.message || e, status: 400 });
  });

  if (!device) {
    return;
  }

  const configExists = await core.getBucketData(device.bucket as string, {
    variables: ["application_id", "downlink_key"],
    qty: 1,
  });
  console.log(configExists);

  if (!configExists.length) {
    const downlinkKey = (req.headers["X-Downlink-Apikey"] || req.headers["x-downlink-apikey"]) as string | undefined;
    const downlinkUrl = (req.headers["X-Downlink-Push"] || req.headers["x-downlink-push"]) as string | undefined;

    const configData: { [key: string]: any } = {};
    if (application_ids?.application_id) {
      configData.application_id = application_ids.application_id;
    }

    if (device_id) {
      configData.device_id = device_id;
    }

    if (downlinkKey) {
      configData.downlink_key = { value: downlinkKey, metadata: { url: downlinkUrl } };
    }

    core.addBucketData(device.id, device.bucket as string, toTagoFormat(configData)).catch((e) => {
      console.error(`Error inserting data ${e.message}`);
      console.error(e);
    });
  }

  core
    .addBucketData(device.id, device.bucket as string, { variable: "ttn_payload_v3", value: JSON.stringify(data) })
    .catch((e) => {
      console.error(`Error inserting data ${e.message}`);
      console.error(e);
    });

  sendResponse(res, { body: { message: "Data accepted" }, status: 201 });
}

export default uplinkService;
export { getDevice };
