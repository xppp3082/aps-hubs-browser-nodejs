import { BaseExtension } from "./BaseExtension.js";
import { EditPanel } from "./EditPanel.js";

class EditExtension extends BaseExtension {
  constructor(viewer, options) {
    super(viewer, options);
    this.panel = null;
    this.viewer = viewer;
  }

  async load() {
    try {
      super.load();
      return true;
    } catch (error) {
      console.error("Error loading EditExtension:", error);
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
      console.error("Error unloading EditExtension:", error);
      return false;
    }
  }

  onToolbarCreated() {
    this.button = this.createToolbarButton(
      "edit-button",
      "https://img.icons8.com/?size=100&id=12781&format=png&color=000000",
      "模型元件瀏覽器"
    );

    this.button.onClick = () => {
      if (!this.panel) {
        this.panel = new EditPanel(this, "edit-panel", "模型元件瀏覽器2", {
          x: 10,
          y: 10,
        });
        // 因為 initialize 是 async 的，所以如果將 creatUI 直接放在 initialize 後面
        // 會 Viewer 還沒被初始化完成，導致 createUI 無法取得 Viewer 的實例
        // this.panel.createUI();
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
  "EditExtension",
  EditExtension
);
