import toTagoFormat from "../lib/toTagoFormat";

function transformLatLngToLocation(fields, serie, prefix = "") {
  if ((fields.latitude && fields.longitude) || (fields.lat && fields.lng)) {
    const lat = fields.lat || fields.latitude;
    const lng = fields.lng || fields.longitude;

    // Change to TagoIO format.
    // Using variable "location".
    const variable = {
      variable: `${prefix}location`,
      value: `${lat}, ${lng}`,
      location: { lat, lng },
      serie,
    };

    delete fields.latitude; // remove latitude so it's not parsed later
    delete fields.longitude; // remove latitude so it's not parsed later
    delete fields.lat; // remove latitude so it's not parsed later
    delete fields.lng; // remove latitude so it's not parsed later

    return variable;
  }
  return null;
}

function parseGatewayFields(metadata, default_serie) {
  if (!metadata.gateways) return []; // If gateway fields doesn't exist, just ignore the metadata.
  let result: any = [];

  // Get only the Gateway fields
  for (const item of metadata.gateways) {
    // create a unique serie for each gateway.
    const serie = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    const location = transformLatLngToLocation(item, serie, "gtw_");
    if (location) {
      result.push(location);
    }

    result = result.concat(toTagoFormat(item, serie));
  }
  delete metadata.gateways;

  result = result.concat(toTagoFormat(metadata, default_serie));

  return result;
}

function inspectFormat(object_item: any, serie: string, old_key?: string) {
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
      result = result.concat(inspectFormat(object_item[key], serie, key));
    } else {
      result.push({
        variable: old_key ? `${old_key}_${key}`.toLowerCase() : `${key}`.toLowerCase(),
        value: object_item[key],
        serie,
      });
    }
  }

  return result;
}

export default function ttnParser(payload: any) {
  console.log(payload);
  if (!Array.isArray(payload)) {
    return payload;
  }
  // Just convert lat and lng, or latitude and longitude to TagoIO format.
  // Check if what is being stored is the ttn_payload.
  // Payload is an environment variable. Is where what is being inserted to your device comes in.
  // Payload always is an array of objects. [ { variable, value...}, {variable, value...} ...]
  let ttn_payload = payload.find((x) => x.variable === "ttn_payload");
  if (ttn_payload) {
    // Get a unique serie for the incoming data.
    const serie = ttn_payload.serie || new Date().getTime();

    // Parse the ttn_payload to JSON format (it comes in a String format)
    ttn_payload = JSON.parse(ttn_payload.value);

    if (ttn_payload.payload_raw) {
      ttn_payload.payload = Buffer.from(ttn_payload.payload_raw, "base64").toString("hex");
      delete ttn_payload.payload_raw;
    }

    // Parse the payload_fields. Go to inspectFormat function if you need to change something.
    if (ttn_payload.payload_fields) {
      ttn_payload.payload_fields.decoded_payload = ttn_payload.payload;
      delete ttn_payload.payload;
      payload = payload.concat(inspectFormat(ttn_payload.payload_fields, serie));
      delete ttn_payload.payload_fields; // remove, so it's not parsed again later.
    }

    // Parse the gateway fields,
    if (ttn_payload.metadata || ttn_payload.rx_metadata) {
      payload = payload.concat(parseGatewayFields(ttn_payload.metadata || ttn_payload.rx_metadata, serie));
      delete ttn_payload.metadata;
      delete ttn_payload.rx_metadata;
    }

    payload = payload.concat(toTagoFormat(ttn_payload, serie));
  }

  let ttn_payload_v3 = payload.find((x) => x.variable === "ttn_payload_v3");
  if (ttn_payload_v3) {
    // Get a unique serie for the incoming data.
    const serie = ttn_payload_v3.serie || new Date().getTime();

    // Parse the ttn_payload_v3 to JSON format (it comes in a String format)
    ttn_payload_v3 = JSON.parse(ttn_payload_v3.value);

    let to_tago: any = {};

    if (ttn_payload_v3.location_solved) {
      to_tago.location = {
        value: `${ttn_payload_v3.location_solved.location.latitude},${ttn_payload_v3.location_solved.location.longitude}`,
        location: {
          lat: ttn_payload_v3.location_solved.location.latitude,
          lng: ttn_payload_v3.location_solved.location.longitude,
        },
      };
      to_tago.accuracy = ttn_payload_v3.location_solved.location.accuracy;
      to_tago.source = ttn_payload_v3.location_solved.location.source;
    }

    if (ttn_payload_v3.uplink_message) {
      ttn_payload_v3 = ttn_payload_v3.uplink_message;

      to_tago.fport = ttn_payload_v3.f_port;
      to_tago.fcnt = ttn_payload_v3.f_cnt;
      to_tago.payload = Buffer.from(ttn_payload_v3.frm_payload, "base64").toString("hex");
    }

    if (ttn_payload_v3.rx_metadata && ttn_payload_v3.rx_metadata.length) {
      const rx_metadata = ttn_payload_v3.rx_metadata[0];
      to_tago.gateway_eui = rx_metadata.gateway_ids.eui;
      to_tago.rssi = rx_metadata.rssi;
      to_tago.snr = rx_metadata.snr;
      if (rx_metadata.location && rx_metadata.location.latitude && rx_metadata.location.longitude) {
        const lat = rx_metadata.location.latitude;
        const lng = rx_metadata.location.longitude;
        to_tago.gateway_location = { value: `${lat},${lng}`, location: { lat, lng } };
      }

      delete ttn_payload_v3.rx_metadata;
    }
    let decoded = [];
    if (ttn_payload_v3.decoded_payload && Object.keys(ttn_payload_v3.decoded_payload).length) {
      decoded = inspectFormat(ttn_payload_v3.decoded_payload, serie);
      to_tago = { ...to_tago, frm_payload: Buffer.from(ttn_payload_v3.frm_payload, "base64").toString("hex") };
      delete to_tago.payload;
    }

    if (ttn_payload_v3.settings) {
      to_tago = { ...to_tago, ...inspectFormat(ttn_payload_v3.settings, serie) };
    }

    payload = payload
      .concat(decoded)
      .filter((x) => x.variable !== "ttn_payload_v3")
      .concat(toTagoFormat(to_tago, serie));
  }
  payload = payload.filter((x) => !x.location || (x.location.lat !== 0 && x.location.lng !== 0));

  return payload;
}
