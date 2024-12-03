const express = require("express");
const session = require("cookie-session");
const { PORT, SERVER_SESSION_SECRET } = require("./config.js");
const mongoose = require("mongoose");

let app = express();
app.use(express.static("wwwroot"));
app.use(express.json());
app.use(
  session({ secret: SERVER_SESSION_SECRET, maxAge: 24 * 60 * 60 * 1000 })
);
app.use(require("./routes/auth.js"));
app.use(require("./routes/hubs.js"));

// 新增 modelAction 路由
app.use("/api/modelActions", require("./routes/modelActions.js"));

// 連接 MongoDB
mongoose
  .connect("mongodb://localhost:27017/forge_actions", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB..."))
  .catch((error) => console.error("Failed to connect to MongoDB...", error));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));
