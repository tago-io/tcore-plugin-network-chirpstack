import { ActionTypeModule, PayloadEncoderModule, ServiceModule } from "@tago-io/tcore-sdk";
import bodyParser from "body-parser";
import express from "express";
import sendResponse from "./lib/sendResponse";
import downlinkService from "./Services/downlink";
import downlinkAction from "./Services/downlinkAction";
import parser from "./Services/parser";
import uplinkService from "./Services/uplink";
import { IConfigParam } from "./types";

const NetworkService = new ServiceModule({
  id: "network-chirpstack",
  name: "Chirpstack LoRaWAN",
  configs: [
    {
      name: "Port",
      tooltip: "Port used by the integration to receive connections",
      icon: "cog",
      field: "port",
      type: "number",
      required: true,
      placeholder: "8000",
      defaultValue: "8000",
    },
    {
      name: "Chirpstack endpoint",
      tooltip: "Address of your Chirpstack server",
      icon: "cog",
      field: "url",
      type: "number",
      required: false,
      placeholder: "http://localhost:8080",
      defaultValue: "",
    },
    {
      name: "Downlink token",
      tooltip: "Bearer token generated at Chirpstack to authorize downlinks",
      icon: "cog",
      field: "downlink_token",
      type: "number",
      required: false,
      placeholder: "",
      defaultValue: "",
    },
    {
      name: "Authorization Code",
      tooltip: "Enter an authorization code to be used at Chirpstack",
      icon: "cog",
      field: "authorization_code",
      type: "string",
      required: true,
      placeholder: "TagoCore-Auth",
      defaultValue: "TagoCore-Auth",
    },
  ],
});

const encoder = new PayloadEncoderModule({
  id: "network-chirpstack-encoder",
  name: "Chirpstack LoRaWAN",
});

encoder.onCall = parser;

const action = new ActionTypeModule({
  id: "chirpstack-downlink-trigger",
  name: "Chirpstack downlink",
  option: {
    description: "Send a downlink to a LoRaWAN Chirpstack device",
    name: "Downlink to Chirpstack Device",
    icon: "$PLUGIN_FOLDER$/assets/downlink.png",
    configs: [
      {
        name: "Port",
        field: "port",
        type: "number",
        tooltip: "Enter the port that the downlink will be send to",
        required: true,
        placeholder: "1",
      },
      {
        name: "Payload (HEX)",
        field: "payload",
        type: "string",
        tooltip: "Enter the payload in hexadecimal. You can use keyword $VALUE$ to send to same device of the trigger.",
        required: true,
        defaultValue: "$VALUE$",
      },
      {
        name: "Device ID",
        field: "device",
        type: "string",
        tooltip:
          "Device that will receive the downlink. You can use keyword $DEVICE_ID$ to send to same device of the trigger.",
        required: true,
        defaultValue: "$DEVICE_ID$",
      },
      {
        name: "Confirmed",
        field: "confirmed",
        type: "boolean",
        tooltip: "Send confirmed parameter to the network server",
        required: false,
        defaultValue: false,
      },
    ],
  },
});

let pluginConfig: IConfigParam | undefined;
action.onCall = (...params) => downlinkAction(pluginConfig as IConfigParam, ...params);

let app = express();
NetworkService.onLoad = async (configParams: IConfigParam) => {
  if (!app) {
    app = express();
  }
  pluginConfig = configParams;

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));

  // parse application/json
  app.use(bodyParser.json());

  app.listen(configParams.port, () => {
    console.info(`Chiprstack started at port ${configParams.port}`);
  });

  app.get("/", (req, res) => sendResponse(res, { body: { status: true, message: "Running" }, status: 200 }));
  app.post("/uplink", (req, res) => uplinkService(configParams, req, res));
  app.post("/downlink", (req, res) => downlinkService(configParams, req, res));
  // app.post("/error", (req, res) => res.send(""));
  app.get("/status", (req, res) => sendResponse(res, { body: { status: true, message: "Running" }, status: 200 }));

  app.use((req, res) => res.redirect("/"));
};

NetworkService.onDestroy = async () => console.log("stopped");
