import { IBucketData } from "@tago-io/tcore-sdk/build/Types";
import toTagoFormat from "../lib/toTagoFormat";

/**
 * Parse the RX Info of the Chirpstack payload. Usually contains gateway information
 */
function parseRxInfo(data: any, serie: string) {
  const result: Partial<IBucketData>[] = [];
  for (let i = 0; i < data.length; ++i) {
    // gatewayID (base64)
    if (data[i].gatewayID)
      result.push({
        variable: `rx_${i}_gateway_id`,
        value: Buffer.from(data[i].gatewayID, "base64").toString("hex"),
        serie,
      });
    // time (string)
    if (data[i].time) result.push({ variable: `rx_${i}_time`, value: data[i].time, serie });
    // time since gps epoch
    if (data[i].timeSinceGPSEpoch)
      result.push({ variable: `rx_${i}_time_since_gps_epoch`, value: data[i].timeSinceGPSEpoch, serie });
    // rssi (integer)
    if (data[i].rssi) result.push({ variable: `rx_${i}_rssi`, value: data[i].rssi, serie });
    // loRaSNR (integer)
    if (data[i].loRaSNR) result.push({ variable: `rx_${i}_lorasnr`, value: data[i].loRaSNR, serie });
    // channel (integer)
    if (data[i].channel) result.push({ variable: `rx_${i}_channel`, value: data[i].channel, serie });
    // rfChain (integer)
    if (data[i].rfChain) result.push({ variable: `rx_${i}_rf_chain`, value: data[i].rfChain, serie });
    // board (integer)
    if (data[i].board) result.push({ variable: `rx_${i}_board`, value: data[i].board, serie });
    // antenna (integer)
    if (data[i].antenna) result.push({ variable: `rx_${i}_antenna`, value: data[i].antenna, serie });
    // location latitude (double)
    if (data[i].location && data[i].location.latitude && data[i].location.longitude) {
      result.push({
        variable: `rx_${i}_location`,
        value: `${data[i].location.latitude},${data[i].location.longitude}`,
        location: { type: "point", coordinates: [data[i].location.longitude, data[i].location.latitude] },
        serie,
      });
    }

    // result.push({ variable: `rx_${i}_location_altitude`, value: data[i].location.altitude, serie: serie });
    // // fine timestamp type (string)
    if (data[i].fineTimestampType)
      result.push({ variable: `rx_${i}_fine_timestamp_type`, value: data[i].fineTimestampType, serie });
    // context (base64)
    if (data[i].context)
      result.push({
        variable: `rx_${i}_context`,
        value: Buffer.from(data[i].context, "base64").toString("hex"),
        serie,
      });
    // // // uplink id (base64)
    // // result.push({ variable: `rx_${i}_uplink_id`, value: Buffer.from(data[i].uplinkID, "base64").toString("hex"), serie: serie });
  }

  return result;
}

/**
 * Parse the TX Info of the Chirpstack payload. Usually contains transceiver information
 */
function parseTxInfo(data: any, serie: string) {
  const result: Partial<IBucketData>[] = [];

  // frequency (integer)
  if (data.frequency) result.push({ variable: "frequency", value: data.frequency, serie });
  // modulation (string)
  if (data.modulation) result.push({ variable: "modulation", value: data.modulation, serie });
  // lora modulation info (integer)
  if (data.loRaModulationInfo) {
    result.push({ variable: "bandwidth", value: data.loRaModulationInfo.bandwidth, serie });
    // spreading factor (integer)
    result.push({ variable: "spreading_factor", value: data.loRaModulationInfo.spreadingFactor, serie });
    // code rate (string)
    result.push({ variable: "code_rate", value: data.loRaModulationInfo.codeRate, serie });
    // polarization inversion (boolean)
    result.push({ variable: "polarization_inversion", value: data.loRaModulationInfo.polarizationInversion, serie });
  }
  return result;
}

/**
 * Decode data from Chirpstack
 * @param payload any payload sent by the device
 * @returns data to be stored
 */
export default async function parser(payload: any) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload.end_device_ids) {
    return payload;
  }

  let to_tago: IBucketData[] = [];
  const serie = String(new Date().getTime());

  // rename
  if (payload.applicationID) {
    payload.application_id = payload.applicationID;
    delete payload.applicationID;
  }
  if (payload.applicationName) {
    payload.application_name = payload.applicationName;
    delete payload.applicationName;
  }
  if (payload.deviceName) {
    payload.device_name = payload.deviceName;
    delete payload.adeviceName;
  }
  if (payload.devEUI) {
    payload.device_eui = payload.devEUI;
    delete payload.devEUI;
  }
  if (payload.externalPowerSource) {
    payload.external_power_source = payload.externalPowerSource;
    delete payload.externalPowerSource;
  }
  if (payload.externalLevelUnavailable) {
    payload.external_level_unavailable = payload.externalLevelUnavailable;
    delete payload.externalLevelUnavailable;
  }
  if (payload.batteryLevel) {
    payload.battery_level = payload.batteryLevel;
    delete payload.batteryLevel;
  }

  // base64 variables
  if (payload.devAddr) {
    payload.dev_addr = Buffer.from(payload.devAddr, "base64").toString("hex");
    delete payload.devAddr;
  }
  if (payload.data) {
    payload.payload = Buffer.from(payload.data, "base64").toString("hex");
    delete payload.data;
  }

  // Parse rx info
  if (payload.rxInfo) {
    to_tago = to_tago.concat(parseRxInfo(payload.rxInfo, serie) as any);
    delete payload.rxInfo;
  }
  // Parse tx info
  if (payload.txInfo) {
    to_tago = to_tago.concat(parseTxInfo(payload.txInfo, serie) as any);
    delete payload.txInfo;
  }
  // Tags
  if (payload.tags) {
    to_tago = to_tago.concat(toTagoFormat(payload.tags, serie));
    delete payload.tags;
  }

  to_tago = to_tago.concat(toTagoFormat(payload, serie));

  payload = to_tago;
  payload = payload.filter((x) => !x.location || (x.location.lat !== 0 && x.location.lng !== 0));

  return payload as IBucketData[];
}
