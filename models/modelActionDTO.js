const { model } = require("mongoose");

class ModelActionDTO {
  constructor(action, dbid, x, y, z, urn, elementId) {
    this.action = action;
    this.dbid = dbid;
    this.x = x;
    this.y = y;
    this.z = z;
    this.urn = urn;
    this.elementId = elementId;
  }
}

module.exports = ModelActionDTO;
