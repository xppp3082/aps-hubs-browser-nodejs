export function getElementId(viewer, dbId) {
  return new Promise((resolve, reject) => {
    viewer.getProperties(dbId, (props) => {
      const elementIdProperty = props.properties.find(
        (prop) => prop.attributeName === "ElementId"
      );
      if (elementIdProperty) {
        resolve(elementIdProperty.displayValue);
      } else {
        reject(new Error("ElementId not found"));
      }
    });
  });
}

export function convertUnitBasedOnModel(viewer, distance) {
  const modelUnit = viewer.model.getUnitString();
  switch (modelUnit) {
    case "mm":
      return distance * 10;
    case "cm":
      return distance * 1;
    case "m":
      return distance / 100;
    case "km":
      return distance / 100000;
    case "ft":
      return distance / 30.48;
    case "in":
      return distance / 2.54;
    default:
      return distance;
  }
}

export const viewerUtils = { getElementId, convertUnitBasedOnModel };
