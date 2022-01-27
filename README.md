![TagoCore](/assets/logo-plugin-black.png)

# About

This is a TTN/TTI v3 Integration plugin. It adds a new route in the TagoCore for you to be able to receive data from TTN/TTI using webhooks.

It also gives downlink support in one of the API routes and through actions.

---

# Settings

This section describes each configuration field for this Plugin.


### Port

Port that will be used by the MQTT Broker to receive connections.

### Authorization Code

Authorization code to be used at the Authorization header for all requests to the plugin.


---

# Adding the Webhook at TTN

This section describes Actions that you can use to publish or receive data from the topics being used in the Broker.

1. In the TagoCore, fill up the Authorization Code field and copy it.

2. Go to your TTN v3 console and create a new Integration. You can create a new integration under the menu Integrations > Webhooks > Add Webhook > TagoIO.

Fill the fields accordingly:

* **Webhook ID**: Any id you want. Example: tagoio-integration
* **Webhook Format**: JSON
* **URL**: Enter your TagoCore address
* **Downlink API Key**: If requested, enter any value that you prefer. This will be automatically send to TagoIO in order to perform downlinks.
* **Additional Headers**: Create a Header for Authorization and set it’s value to the authorization previously generated at step 1

![TTN Configuration](/assets/ttn-help.png)

## License

MIT
