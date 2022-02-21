import { core } from "@tago-io/tcore-sdk";
import { IConfigParam } from "../types";
import downlinkService, { IDownlinkParams } from "./downlink";

const resMockup: any = {
  json: () => this,
  status: () => this,
};

/**
 * Executed for Action downlink type.
 * @param config Chirpstack configuration
 * @param classAConfig optinal parameter sent by Chirpstack for class A devices
 */
async function downlinkAction(
  pluginConfig: IConfigParam,
  action_id: string,
  action_settings: IDownlinkParams,
  data_list: any
) {
  const action = await core.getActionInfo(action_id);

  if (Array.isArray(data_list) && data_list[0].variable) {
    const variables = action.trigger.conditions.map((condition) => condition.variable);
    const data = data_list.find((item) => variables.includes(item.variable));

    action_settings.payload = action_settings.payload.replace(/\$VALUE\$/g, data.value);
    action_settings.payload = action_settings.payload.replace(/\$VARIABLE\$/g, data.variable);
    action_settings.payload = action_settings.payload.replace(/\$SERIE\$/g, data.serie);

    if (action_settings.device.toLowerCase() === "$device_id$") {
      const deviceInfo = await core.getDeviceInfo(data.origin);
      action_settings.device = deviceInfo.id;
    }
  }

  // Any, so we don't need to replicate the full req object
  const reqMockup: any = {
    headers: {
      Authorization: pluginConfig.authorization_code,
    },
    body: {
      device: action_settings.device,
      payload: action_settings.payload,
      port: action_settings.port,
      confirmed: action_settings.confirmed,
    },
  };

  await downlinkService(pluginConfig, reqMockup, resMockup);
}

export default downlinkAction;
