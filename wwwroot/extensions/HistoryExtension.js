import { BaseExtension } from "./BaseExtension.js";
import { HistoryPanel } from "./HistoryPanel.js";

class HistoryExtension extends BaseExtension {
  constructor(viewer, options) {
    super(viewer, options);
    this.panel = null;
  }

  load() {
    super.load();
    console.log("HistoryExtension loaded.");
    return true;
  }

  unload() {
    super.unload();
    if (this.panel) {
      this.panel.setVisible(false);
      this.panel = null;
    }
    return true;
  }

  // "https://img.icons8.com/?size=50&id=12371&format=png"
  onToolbarCreated() {
    this.button = this.createToolbarButton(
      "history-button",
      "https://img.icons8.com/?size=100&id=70301&format=png&color=000000",
      "顯示操作歷史"
    );

    this.button.onClick = () => {
      if (!this.panel) {
        this.panel = new HistoryPanel(this, "history-panel", "操作歷史");
        this.panel.setVisible(false);
        this.panel.initialize();
      }
      this.panel.setVisible(!this.panel.isVisible());
      this.button.setState(
        this.panel.isVisible()
          ? Autodesk.Viewing.UI.Button.State.ACTIVE
          : Autodesk.Viewing.UI.Button.State.INACTIVE
      );
    };
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "HistoryExtension",
  HistoryExtension
);
