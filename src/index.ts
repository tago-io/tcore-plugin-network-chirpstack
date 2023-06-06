import { Server } from "http";
import { ActionTypeModule, PayloadEncoderModule, ServiceModule } from "@tago-io/tcore-sdk";
import bodyParser from "body-parser";
import express, { Express } from "express";
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
      defaultValue: 8000,
    },
    {
      name: "Chirpstack endpoint",
      tooltip: "Address of your Chirpstack server",
      icon: "cog",
      field: "url",
      type: "string",
      required: false,
      placeholder: "http://localhost:8080",
    },
    {
      name: "Downlink token",
      tooltip: "Bearer token generated at Chirpstack to authorize downlinks",
      icon: "cog",
      field: "downlink_token",
      type: "string",
      required: false,
      placeholder: "",
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
  name: "Chirpstack Downlink-Action",
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
        defaultValue: false,
      },
    ],
  },
});

let pluginConfig: IConfigParam | undefined;
action.onCall = (...params) => downlinkAction(pluginConfig as IConfigParam, ...params);

let app: Express | undefined;
let server: Server | undefined;
NetworkService.onLoad = async (configParams: IConfigParam) => {
  if (server) {
    await server.close();
  }
  app = express();

  pluginConfig = configParams;
  if (!pluginConfig.port) {
    throw "Port not specified";
  } else if (!pluginConfig.authorization_code) {
    throw "Authorization code not specified";
  }

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));
  // parse application/json
  app.use(bodyParser.json());

  const startServer = () => {
    return new Promise((resolve, reject) => {
      if (!app) {
        return reject("Internal error");
      }

      server = app.listen(configParams.port, () => {
        console.info(`Chirpstack-Integration started at port ${configParams.port}`);
        resolve(true);
      });

      server.on("close", () => reject("Server manually closed"));
      server.on("error", (e) => {
        reject(e);
      });
    });
  };

  await startServer();

  app.get("/", (req, res) => sendResponse(res, { body: { status: true, message: "Running" }, status: 200 }));
  app.post("/uplink", (req, res) =>
    uplinkService(configParams, req, res).catch((e) =>
      sendResponse(res, { body: { status: false, message: e?.message || e }, status: 400 })
    )
  );
  app.post("/downlink", (req, res) =>
    downlinkService(configParams, req, res).catch((e) =>
      sendResponse(res, { body: { status: false, message: e?.message || e }, status: 400 })
    )
  );
  // app.post("/error", (req, res) => res.send(""));
  app.get("/status", (req, res) => sendResponse(res, { body: { status: true, message: "Running" }, status: 200 }));

  app.use((req, res) => res.redirect("/"));
};

NetworkService.onDestroy = async () => {
  if (server) {
    await server.close();
    server = undefined;
  }
};
