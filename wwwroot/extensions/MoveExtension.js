import { BaseExtension } from "./BaseExtension.js";
import { MovePanel } from "./MovePanel.js";

class MoveExtension extends BaseExtension {
  constructor(viewer, options) {
    super(viewer, options);
    this.panel = null;
    this.button = null;

    this.selectedDbId = null;
    this.viewer = viewer;
  }

  async load() {
    try {
      await super.load(); // 等待父類別的 load 完成
      this.panel = new MovePanel(this, "move-panel", "Move Elements");
      await this.panel.initialize(); // 假設 initialize 可能需要時間
      this.panel.setVisible(false);

      console.log("Create MoveButton");
      this.viewer.addEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        this.onSelectionChanged.bind(this)
      );

      console.log("MoveExtension loaded");
      return true;
    } catch (error) {
      console.error("Error loading MoveExtension:", error);
      return false;
    }
  }

  async unload() {
    try {
      await super.unload(); // 等待父類別的 unload 完成

      if (this.panel) {
        this.panel.setVisible(false);
        await this.panel.uninitialize(); // 假設 uninitialize 可能需要時間
        this.panel = null;
      }

      if (this.button) {
        this.removeToolbarButton(this.button);
        this.button = null;
      }

      console.log("MoveExtension unloaded");
      this.viewer.removeEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        this.onSelectionChanged.bind(this)
      );

      return true;
    } catch (error) {
      console.error("Error unloading MoveExtension:", error);
      return false;
    }
  }

  onToolbarCreated() {
    // this.panel.initialize();
    console.log("Create MoveButton");
    this.button = this.createToolbarButton(
      "move-button",
      "https://img.icons8.com/?size=100&id=78763&format=png&color=000000",
      "Move Model Button"
    );
    this.button.onClick = () => {
      if (!this.panel) {
        this.panel = new MovePanel(this, "move-panel", "Move Elements");
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

  // async onSelectionChanged(event)
  onSelectionChanged(event) {
    console.log("完整事件物件:", event); // 直接出處事件物件
    console.log("事件物件型別：", typeof event); // 輸出物件型別
    // console.log("事件物件結構：", JSON.stringify(event, null, 2)); // 格式化輸出

    // 檢查 panel 是否存在，如果不存在就重新初始化
    if (!this.panel) {
      console.log("Panel not found, initializing...");
      this.panel = new MovePanel(this, "move-panel", "Move Elements");
      this.panel.initialize();
    }

    const dbIds = event.dbIdArray || [];
    console.log(`Selection changed: ${dbIds[0]}`);
    if (dbIds.length > 0) {
      this.selectedDbId = dbIds[0];
      this.panel.setSelectedElement(this.selectedDbId);
      console.log(`Selected object: ${this.selectedDbId}`);
    } else {
      this.selectedDbId = null;
      this.panel.setSelectedElement(null);
    }
  }

  moveSelectedElement(x, y, z) {
    if (this.selectedDbId) {
      this.panel.moveElement(this.selectedDbId, x, y, z);
    }
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "MoveExtension",
  MoveExtension
);
