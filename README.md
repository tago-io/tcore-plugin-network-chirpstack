![TagoCore](/assets/logo-plugin-black.png)

# About

This is a Chirpstack Integration plugin. It adds a new route in the TagoCore for you to be able to receive data from Chirpstack using webhooks.

It also gives downlink support in one of the API routes and through actions.

---

# Settings

This section describes each configuration field for this Plugin.


### Port

Port that will be used by the integration to receive connections.


### Chirpstack endpoint

Enter the URL of your Chirpstack server. Needed for the integration to know where to send downlink request.


### Downlink Token

A bearer token generate at Chirpstack to authorize requests from the integration.

### Authorization Code

Authorization code to be used at the Authorization header for all requests to the plugin.

---

# Adding the Webhook at Chirpstack

This section describes Actions that you can use to publish or receive data from the topics being used in the Broker.

1. In the TagoCore, fill up the Authorization Code field and copy it.

2. Go to the Chirpstack website and create a new HTTP integration. You can create the integration by going to Application > Select your application > Integration, click on create, and select HTTP as an option.

Fill the fields accordingly:

* **Type**: HTTP integration
* **Add Header key**: Authorization and Header value being the Authorization code copied from TagoCore at step 1
* **Add Header key**: Content-Type and header value: application/json
* **Uplink endpoint**: Enter your integration address, such as http://localhost:8000/uplink. Make sure you include the /uplink at the end of the address. Port must be the same as in your plugin configuration.


![Chirpstack Configuration](/assets/chirpstack-help.png)

---
# Setting up the Device on TagoCore
The network server LoraWAN Chirpstack sends the device EUI as an identification of which device is sending data.

In order for the integration to properly identify the device, you must add a tag of each one of your devices in the TagoCore, as follow:

* **Tag key**: serial
* **Tag value**: copy the Device EUI in the value of the tag.

---
# Action type: Send downlink to the device
This integration also add a new action which you can use the send downlink to the device. Such as select as type of the action when setting up new actions.

If using an Action trigger of Variable, you can enter dynamically setup the device and payload:

* **Device**: You can enter $DEVICE_ID$ to dynamically get the ID of the device that triggered the action.
* **Payload**: You can enter $VALUE$ to dynamically get the value of the variable.

## License

MIT
