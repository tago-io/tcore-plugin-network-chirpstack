/**
 * Resolve response for AWS Lambda Proxy
 * @param cb AWS Lambda Callback Function
 * @param defaultStatus Default Status Code
 * @param response Middleware Default Response Object
 */
function sendResponse(res: any, response: { body: any; status?: number }) {
  // ? If a throw command is executed without wrapper
  if (typeof response === "string") {
    response = { body: response };
  }

  const { body, status = 200 } = response;
  res.status(status).json(body);
  // cb(null, lambdaResponse(body, status, headers));
}

export default sendResponse;
