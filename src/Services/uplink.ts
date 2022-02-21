import { core } from "@tago-io/tcore-sdk";
import { Request, Response } from "express";
import { IConfigParam } from "../types";
import sendResponse from "../lib/sendResponse";

interface IChirpstackPayload {
  applicationID: string;
  applicationName: string;
  deviceName: string;
  devEUI: string;
  devAddr: string;
  rxInfo: {}[];
  txInfo: {};
  adr: boolean;
  dr: number;
  fCnt: number;
  fPort: number;
  data?: string;
  payload?: string;
  objectJSON: string;
  tags: {};
  margin: number;
  externalPowerSource: boolean;
  batteryLevelUnavailable: boolean;
  batteryLevel: number;
}

/**
 * Find the device in the TagoCore using tag serial
 * @param dev_eui serial value tag
 */
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

/**
 * Handles the Uplink from Chirpstack
 */
async function uplinkService(config: IConfigParam, req: Request, res: Response) {
  const authorization = req.headers["Authorization"] || req.headers["authorization"];
  if (!authorization || authorization !== config.authorization_code) {
    console.error(`[Network Server] Request refused, authentication is invalid: ${authorization}`);
    return sendResponse(res, { body: "Invalid authorization header", status: 401 });
  }

  const data: IChirpstackPayload = req.body;
  if (!data.devEUI) {
    console.error(`[Network Server] Request refused, body is invalid`);
    return sendResponse(res, { body: "Invalid body received", status: 401 });
  }

  const { devEUI: h_serial } = data;
  let hardware_serial = Buffer.from(h_serial, "base64").toString("hex");
  if (hardware_serial.length !== 16) {
    hardware_serial = h_serial;
  }

  const device = await getDevice(hardware_serial).catch((e) => {
    return sendResponse(res, { body: e.message || e, status: 400 });
  });

  if (!device) {
    return;
  }

  core.addBucketData(device.id, device.bucket as string, data).catch((e) => {
    console.error(`Error inserting data ${e.message}`);
    console.error(e);
  });

  sendResponse(res, { body: { message: "Data accepted" }, status: 201 });
}

export default uplinkService;
export { getDevice, IChirpstackPayload };
