import { IBucketData } from "@tago-io/tcore-sdk/build/Types";

interface IToTagoObject {
  [key: string]: string | number | boolean | IToTagoObject;
}

/**
 * Transforms an object to a TagoIO data array object
 * @param object_item object data to be parsed
 * @param serie default serie for all data
 * @param old_key internal use for object values
 */
function toTagoFormat(object_item: IToTagoObject, serie?: string, prefix = "") {
  const result: any = [];
  for (const key in object_item) {
    if (typeof object_item[key] === "object") {
      result.push({
        variable: (object_item[key]["variable"] || `${prefix}${key}`).toLowerCase(),
        value: object_item[key]["value"],
        serie: object_item[key]["serie"] || serie,
        metadata: object_item[key]["metadata"],
        location: object_item[key]["location"],
        unit: object_item[key]["unit"],
      });
    } else {
      result.push({
        variable: `${prefix}${key}`.toLowerCase(),
        value: object_item[key],
        serie,
      });
    }
  }

  return result as IBucketData[];
}

export default toTagoFormat;
export { IToTagoObject };
