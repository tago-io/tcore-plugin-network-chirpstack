import { IBucketData } from "@tago-io/tcore-sdk/build/Types";
import toTagoFormat from "../lib/toTagoFormat";

interface InspectObject {
  [key: string]: string | number | boolean | InspectObject;
}

/**
 * Transforms an object to a TagoIO data array object
 * Works with nested object as value
 * @param object_item object data to be parsed
 * @param serie default serie for all data
 * @param old_key internal use for object values
 */
function inspectFormat(object_item: InspectObject, serie: string, old_key?: string) {
  let result: any = [];
  for (const key in object_item) {
    if (key === "lng".toLowerCase() || key.toLowerCase() === "longitude") continue;
    else if (key === "lat".toLowerCase() || key.toLowerCase() === "latitude") {
      const lng = object_item.lng || object_item.longitude || object_item.Longitude;
      result.push({
        variable: old_key ? `${old_key}_location`.toLowerCase() : "location",
        value: `${object_item[key]}, ${lng}`,
        location: { lat: Number(object_item[key]), lng: Number(lng) },
        serie,
      });
    } else if (typeof object_item[key] === "object") {
      result = result.concat(inspectFormat(object_item[key] as any, serie, key));
    } else {
      result.push({
        variable: old_key ? `${old_key}_${key}`.toLowerCase() : `${key}`.toLowerCase(),
        value: object_item[key],
        serie,
      });
    }
  }

  return result as IBucketData[];
}

/**
 * Decode data from TTN
 * @param payload any payload sent by the device
 * @returns data to be stored
 */
export default async function ttnParser(payload: any) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload.end_device_ids) {
    return payload;
  }

  let to_tago: InspectObject = {};
  const serie = String(new Date().getTime());

  if (payload.location_solved) {
    to_tago.location = {
      value: `${payload.location_solved.location.latitude},${payload.location_solved.location.longitude}`,
      location: {
        lat: payload.location_solved.location.latitude,
        lng: payload.location_solved.location.longitude,
      },
    };
    to_tago.accuracy = payload.location_solved.location.accuracy;
    to_tago.source = payload.location_solved.location.source;
  }

  if (payload.uplink_message) {
    payload = payload.uplink_message;

    to_tago.fport = payload.f_port;
    to_tago.fcnt = payload.f_cnt;
    to_tago.payload = Buffer.from(payload.frm_payload, "base64").toString("hex");
  }

  if (payload.rx_metadata && payload.rx_metadata.length) {
    const rx_metadata = payload.rx_metadata[0];
    to_tago.gateway_eui = rx_metadata.gateway_ids.eui;
    to_tago.rssi = rx_metadata.rssi;
    to_tago.snr = rx_metadata.snr;
    if (rx_metadata.location && rx_metadata.location.latitude && rx_metadata.location.longitude) {
      const lat = rx_metadata.location.latitude;
      const lng = rx_metadata.location.longitude;
      to_tago.gateway_location = { value: `${lat},${lng}`, location: { lat, lng } };
    }

    delete payload.rx_metadata;
  }

  let decoded: IBucketData[] = [];
  if (payload.decoded_payload && Object.keys(payload.decoded_payload).length) {
    decoded = inspectFormat(payload.decoded_payload, serie);
    to_tago = { ...to_tago, frm_payload: Buffer.from(payload.frm_payload, "base64").toString("hex") };
    delete to_tago.payload;
  }

  if (payload.settings) {
    decoded = decoded.concat(inspectFormat(payload.settings, serie));
  }

  payload = decoded.concat(toTagoFormat(to_tago, serie));
  payload = payload.filter((x) => !x.location || (x.location.lat !== 0 && x.location.lng !== 0));

  return payload as IBucketData[];
}
