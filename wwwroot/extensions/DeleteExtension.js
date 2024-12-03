import { BaseExtension } from "./BaseExtension.js";
import { DeletePanel } from "./DeletePanel.js";

class DeleteExtension extends BaseExtension {
  constructor(viewer, options) {
    super(viewer, options);
    this.panel = null;
    this.button = null;
    this.selectedDbId = null;
    this.viewer = viewer;
  }

  async load() {
    try {
      super.load();
      this.panel = new DeletePanel(this, "delete-panel", "Delete Elements");
      this.panel.initialize();
      this.panel.setVisible(false);

      console.log("Create DeleteButton");
      this.viewer.addEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        this.onSelectionChanged.bind(this)
      );
      console.log("DeleteExtension loaded");
      return true;
    } catch (error) {
      console.error("Error loading DeleteExtension:", error);
      return false;
    }
  }

  async unload() {
    try {
      super.unload();

      if (this.panel) {
        this.panel.setVisible(false);
        this.panel.uninitialize();
        this.panel = null;
      }

      if (this.button) {
        this.removeToolbarButton(this.button);
        this.button = null;
      }

      this.viewer.removeEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        this.onSelectionChanged.bind(this)
      );
      console.log("DeleteExtension unloaded");
      return true;
    } catch (err) {
      console.error("Error unloading DeleteExtension:", error);
      return false;
    }
  }

  onToolbarCreated() {
    console.log("Create DeleteButton");
    this.button = this.createToolbarButton(
      "delete-button",
      "https://img.icons8.com/?size=100&id=67884&format=png", // 刪除圖示
      "Delete Model Button"
    );
    this.button.onClick = () => {
      if (!this.panel) {
        this.panel = new DeletePanel(this, "delete-panel", "Delete Elements");
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

  onSelectionChanged(event) {
    if (!this.panel) {
      console.log("Panel not found, initializing...");
      this.panel = new DeletePanel(this, "delete-panel", "Delete Elements");
      this.panel.initialize();
    }

    const dbIds = event.dbIdArray || [];
    if (dbIds.length > 0) {
      this.selectedDbId = dbIds[0];
      console.log(
        "Message from delete extension Selection changed:",
        this.selectedDbId
      );
      this.panel.setSelectedElement(this.selectedDbId);
      console.log(`Selection changed: ${this.selectedDbId}`);
    } else {
      this.selectedDbId = null;
      this.panel.setSelectedElement(null);
    }
  }

  deleteSelectedElement() {
    if (this.selectedDbId && this.panel) {
      this.panel.deleteElement(this.selectedDbId);
    }
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "DeleteExtension",
  DeleteExtension
);
