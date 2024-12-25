const log4js = require("log4js");

log4js.configure({
  appenders: {
    console: { type: "console" },
    file: {
      type: "dateFile",
      filename: "logs/server.log",
      pattern: ".yyyy-MM-dd",
      compress: true,
    },
    api: {
      type: "dateFile",
      filename: "logs/api.log",
      pattern: ".yyyy-MM-dd",
      compress: true,
    },
  },
  // 設定 logger 的 category，根據前面設定的 appenders 來決定不同 category 時該用怎麼樣的 logger 配置
  categories: {
    default: { appenders: ["console", "file"], level: "info" },
    api: { appenders: ["console", "api"], level: "info" },
  },
});

module.exports = log4js;
