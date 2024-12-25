const log4js = require("../config/logger");

class LoggerFactory {
  static getLogger(category = "default") {
    return log4js.getLogger(category);
  }
}

module.exports = LoggerFactory;
