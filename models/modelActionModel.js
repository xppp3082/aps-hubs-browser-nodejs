const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  dbid: {
    type: Number,
    required: true,
  },
  x: Number,
  y: Number,
  z: Number,
  timestamp: { type: Date, default: Date.now },
  urn: String,
  elementId: { type: String, index: true }, // 儲存 elementId，並添加索引
});
// 建立複合索引
actionSchema.index({ dbid: 1 });

const ActioinModelByUrn = (urn) => {
  const collectionName = `action_${urn}`;
  try {
    return mongoose.model(collectionName);
  } catch (error) {
    // 如果模型不存在，則創建新的
    return mongoose.model(collectionName, actionSchema);
  }
};

module.exports = ActioinModelByUrn;
