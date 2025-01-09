import { BaseExtension } from "./BaseExtension.js";
import { viewerUtils } from "../utils/viewerUtils.js";
import { ListPanel } from "./ListPanel.js";

class ListExtension extends BaseExtension {
  constructor(viewer, options) {
    super(viewer, options);
    this.panel = null;
  }

  async load() {
    try {
      super.load();
      return true;
    } catch (error) {
      console.error("Error loading ListExtension:", error);
      return false;
    }
  }

  async unload() {
    try {
      super.unload();
      if (this.panel) {
        this.panel.setVisible(false);
        this.panel = null;
      }
      return true;
    } catch (error) {
      console.error("Error unloading ListExtension:", error);
      return false;
    }
  }

  onToolbarCreated() {
    this.button = this.createToolbarButton(
      "list-button",
      "https://img.icons8.com/?size=100&id=CiWGW32TM9pM&format=png&color=000000",
      "顯示當前數量統計"
    );

    this.button.onClick = () => {
      if (!this.panel) {
        this.panel = new ListPanel(this, "list-panel", "數量統計");
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
  "ListExtension",
  ListExtension
);
