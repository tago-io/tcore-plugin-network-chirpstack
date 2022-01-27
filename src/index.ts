import { PayloadEncoderPlugin, ServicePlugin } from "@tago-io/tcore-sdk";
import express from "express";
import sendResponse from "./lib/sendResponse";
import downlinkService from "./Services/downlink";
import ttnParser from "./Services/ttnParser";
import uplinkService from "./Services/uplink";
import { IConfigParam } from "./types";

const NetworkService = new ServicePlugin({
  id: "network-ttn",
  name: "TTN/TTI Integration",
  configs: [
    {
      name: "Port",
      tooltip: "Port used by the MQTT Broker to receive connections",
      icon: "cog",
      field: "port",
      type: "number",
      required: true,
      placeholder: "8000",
      defaultValue: "8000",
    },
    {
      name: "Authorization Code",
      tooltip: "Enter an authorization code to be used at TTI",
      icon: "cog",
      field: "authorization_code",
      type: "string",
      required: true,
      placeholder: "TagoCore-Auth",
      defaultValue: "TagoCore-Auth",
    },
  ],
});

const encoder = new PayloadEncoderPlugin({
  id: "network-ttn-encoder",
  name: "TTN/TTI Integration",
});

encoder.onCall = ttnParser;

let app;
NetworkService.onLoad = async (configParams: IConfigParam) => {
  if (!app) {
    app = express();
    app.use(express.json());

    app.listen(configParams.port, () => {
      console.info(`TTN-Integration started at port ${configParams.port}`);
    });

    app.get("/", (req, res) => sendResponse(res, { body: { status: true, message: "Running" }, status: 200 }));
    app.post("/uplink", (req, res) => uplinkService(configParams, req, res));
    app.post("/downlink", (req, res) => downlinkService(configParams, req, res));
    // app.post("/error", (req, res) => res.send(""));
    app.get("/status", (req, res) => sendResponse(res, { body: { status: true, message: "Running" }, status: 200 }));

    app.use(function (req, res) {
      res.redirect("/");
    });
  }
};

NetworkService.onDestroy = async () => console.log("stopped");
