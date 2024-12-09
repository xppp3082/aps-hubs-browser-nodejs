const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// const actionSchema = new mongoose.Schema({
//   action: String,
//   dbid: String,
//   x: Number,
//   y: Number,
//   z: Number,
//   timestamp: { type: Date, default: Date.now },
//   urn: String,
// });

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
});

// 建立複合索引
actionSchema.index({ dbid: 1 });

const getModelForUrn = (urn) => {
  const collectionName = `action_${urn}`;
  try {
    return mongoose.model(collectionName);
  } catch (error) {
    // 如果模型不存在，則創建新的
    return mongoose.model(collectionName, actionSchema);
  }
};

router.post("/move", async (req, res) => {
  try {
    const { urn, dbid, x, y, z } = req.body;
    const Model = getModelForUrn(urn);

    const action = new Model({
      action: "move",
      dbid,
      x,
      y,
      z,
      urn,
    });
    await action.save();
    console.log("Action saved successfully:", action);
    res.json({ success: true, data: action });
  } catch (error) {
    console.error("Error recording move action:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/delete", async (req, res) => {
  try {
    const { urn, dbid } = req.body;
    const Model = getModelForUrn(urn);

    const action = new Model({
      action: "delete",
      dbid,
      urn,
    });

    await action.save();
    res.json({ success: true, data: action });
  } catch (error) {
    console.error(error);
    console.error("Error recording delete action:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 取得特定模型的所有動作
router.get("/:urn/history", async (req, res) => {
  try {
    const { urn } = req.params;
    const { dbid } = req.query;
    const Model = getModelForUrn(urn);

    const query = dbid ? { dbid } : {};
    const actions = await Model.find(query);
    res.json({ success: true, data: actions });
  } catch (error) {
    console.error(error);
    console.error("Error fetching model actions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:urn/getById", async (req, res) => {
  try {
    const { urn } = req.params;
    const { id } = req.query;
    const Model = getModelForUrn(urn);

    const actions = await Model.find({ _id: id }).sort({ timestamp: -1 });
    res.json({ success: true, data: actions });
  } catch (error) {
    console.error("Error fetching model actions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/deleteById", async (req, res) => {
  try {
    const { id } = req.body; // 從請求中獲取 document ID
    const Model = getModelForUrn(req.body.urn); // 獲取對應的模型

    // 刪除對應的紀錄
    const result = await Model.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Action not found" });
    }

    res.json({
      success: true,
      message: `Action with ID ${id} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting action:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 更新特定 dbid 的操作動作
router.put("/update", async (req, res) => {
  try {
    const { urn, dbid, x, y, z, timestamp } = req.body;
    const Model = getModelForUrn(urn);

    // 查找對應的紀錄
    const action = await Model.findOne({ dbid });

    if (!action) {
      return res.status(404).json({ error: "Action not found" });
    }

    // 更新紀錄
    action.x = x;
    action.y = y;
    action.z = z;
    action.timestamp = timestamp;
    await action.save();

    console.log("Action updated successfully:", action);
    res.json({ success: true, data: action });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
