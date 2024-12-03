const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const actionSchema = new mongoose.Schema({
  action: String,
  dbid: String,
  x: Number,
  y: Number,
  z: Number,
  timestamp: { type: Date, default: Date.now },
  urn: String,
});

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
    const Model = getModelForUrn(urn);
    const actions = await Model.find();
    res.json({ success: true, data: actions });
  } catch (error) {
    console.error(error);
    console.error("Error fetching model actions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
