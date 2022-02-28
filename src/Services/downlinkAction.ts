import { core } from "@tago-io/tcore-sdk";
import { IDeviceData } from "@tago-io/tcore-sdk/build/Types";
import { IConfigParam } from "../types";
import downlinkService, { IDownlinkParams } from "./downlink";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resMockup: any = {
  json: () => this,
  status: () => this,
};

/**
 * Executed for Action downlink type.
 *
 * @param pluginConfig - Network plugin configuration
 * @param actionID - action ID that triggered the downlink
 * @param actionSettings - action settings that triggered the downlink
 * @param dataList - device data from the action
 * @returns {void}
 */
async function downlinkAction(
  pluginConfig: IConfigParam,
  actionID: string,
  actionSettings: IDownlinkParams,
  dataList: IDeviceData
) {
  const action = await core.getActionInfo(actionID);

  if (Array.isArray(dataList) && dataList[0].variable) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variables = action.trigger.conditions.map((condition: any) => condition.variable);
    const data = dataList.find((item) => variables.includes(item.variable));

    actionSettings.payload = actionSettings.payload.replace(/\$VALUE\$/g, data.value);
    actionSettings.payload = actionSettings.payload.replace(/\$VARIABLE\$/g, data.variable);
    actionSettings.payload = actionSettings.payload.replace(/\$SERIE\$/g, data.serie);

    if (actionSettings.device.toLowerCase() === "$device_id$") {
      const deviceInfo = await core.getDeviceInfo(data.origin);
      actionSettings.device = deviceInfo.id;
    }
  }

  // Any, so we don't need to replicate the full req object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqMockup: any = {
    headers: {
      Authorization: pluginConfig.authorization_code,
    },
    body: {
      device: actionSettings.device,
      payload: actionSettings.payload,
      port: actionSettings.port,
      confirmed: actionSettings.confirmed,
    },
  };

  await downlinkService(pluginConfig, reqMockup, resMockup);
}

export default downlinkAction;
