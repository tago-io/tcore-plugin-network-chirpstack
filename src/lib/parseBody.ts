import { Request } from "express";

function parseBody(req: Request): any {
  if (!req.body) {
    return {};
  }

  if (req.body instanceof Object) {
    return req.body;
  }

  try {
    return JSON.parse(req.body);
  } catch (error) {
    console.log("error");
    return {};
  }
}

export default parseBody;
