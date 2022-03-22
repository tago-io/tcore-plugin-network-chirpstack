import chirpstackParser from "../Services/parser";

const startingTest = () => console.log("<< Starting Chirpstack Network Plugin Parser test... >>");
const endingTest = () => console.log("<< Test finished! >>");

describe("<< Decoder test running...>>", () => {
  beforeEach(() => startingTest());
  afterEach(() => endingTest());

  test("Chirpstack Result", async () => {
    const body = {
      applicationID: "3",
      applicationName: "Draginos",
      deviceName: "DRA-8805",
      devEUI: "612e5732653a0ef98af08c92",
      rxInfo: [
        {
          gatewayID: "cHb/AGYDAq0=",
          time: "2022-03-10T18:16:02.753475Z",
          timeSinceGPSEpoch: null,
          rssi: -101,
          loRaSNR: 11.5,
          channel: 0,
          rfChain: 0,
          board: 0,
          antenna: 0,
          location: {
            latitude: -33.39311102551892,
            longitude: -70.75781112102258,
            altitude: 0,
            source: "UNKNOWN",
            accuracy: 0,
          },
          fineTimestampType: "NONE",
          context: "rrxYTA==",
          uplinkID: "jWLolBVuRha5bfwCdy2hIw==",
          crcStatus: "CRC_OK",
        },
      ],
      txInfo: {
        frequency: 915200000,
        modulation: "LORA",
        loRaModulationInfo: { bandwidth: 125, spreadingFactor: 9, codeRate: "4/5", polarizationInversion: false },
      },
      adr: false,
      dr: 3,
      fCnt: 1397,
      fPort: 2,
      objectJSON:
        '{\\"Ext_sensor\\":\\"Temperature Sensor\\",\\"bateria\\":3.025,\\"humedad\\":34.3,\\"temperatura\\":25.12,\\"temperatura2\\":327.67}',
      tags: {},
      confirmedUplink: false,
      devAddr: "AHCxJw==",
      payload: "y9EJ0AFXAX//f/8=",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = await chirpstackParser(body as any);
    expect(Array.isArray(payload)).toBe(true);

    console.log(payload);

    const payloadRaw = payload.find((item) => item.variable === "payload");
    const fport = payload.find((item) => item.variable === "fport");
    const rx0Rssi = payload.find((item) => item.variable === "rx_0_rssi");
    const rx0Lorasnr = payload.find((item) => item.variable === "rx_0_lorasnr");
    const rx0Location = payload.find((item) => item.variable === "rx_0_location");
    const rx0FineTimestampType = payload.find((item) => item.variable === "rx_0_fine_timestamp_type");
    const rx0Context = payload.find((item) => item.variable === "rx_0_context");
    expect(payloadRaw?.value).toBeTruthy();
    expect(payloadRaw?.value).toBe("y9EJ0AFXAX//f/8=");
    expect(fport?.value).toBeTruthy();
    expect(fport?.value).toBe(2);
    expect(rx0Rssi?.value).toBeTruthy();
    expect(rx0Lorasnr?.value).toBeTruthy();
    expect(rx0Location?.value).toBeTruthy();
    expect(rx0FineTimestampType?.value).toBeTruthy();
    expect(rx0Context?.value).toBeTruthy();
  });
});
