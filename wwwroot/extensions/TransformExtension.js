import { TransformTool } from "./TransformTool.js";

class TransformExtension extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.tool = null;
    this.group = null;
    this.button = null;
  }

  initialize() {
    this.tool = new TransformTool(this.viewer);
    this.viewer.toolController.registerTool(this.tool);

    if (this.viewer.model.getInstanceTree()) {
      this.customize();
    } else {
      this.viewer.addEventListener(
        Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT,
        () => this.customize()
      );
    }
  }

  // 自定義工具行為
  customize() {
    let isActivate = this.viewer.toolController.activateTool(
      this.tool.getName()
    );
    console.log("isActivate", isActivate);
    // this.viewer.toolController.activateTool(this.tool.getName());
  }

  load() {
    // this.initialize();
    return true;
  }

  unload() {
    if (this.tool) {
      this.viewer.toolController.deactivateTool(this.tool.getName());
    }

    // 移除工具欄按鈕
    if (this.group) {
      this.group.removeControl(this.button);
      if (this.group.getNumberOfControls() === 0) {
        this.viewer.toolbar.removeControl(this.group);
      }
    }
    console.log("TransformExtension is now unloaded!");
    return true;
  }

  // 註冊工具並建立按鈕
  onToolbarCreated() {
    // 創建工具欄群組
    this.group = this.viewer.toolbar.getControl("transform-toolbar-group");
    if (!this.group) {
      this.group = new Autodesk.Viewing.UI.ControlGroup(
        "transform-toolbar-group"
      );
      this.viewer.toolbar.addControl(this.group);
    }

    // 新增按鈕
    this.button = new Autodesk.Viewing.UI.Button("transformExtensionButton");
    this.button.icon.classList.add("fas", "fa-arrows-alt");
    this.button.setToolTip("Transform Object");

    // 定義按鈕點擊事件
    this.button.onClick = () => {
      if (this.button.getState() !== Autodesk.Viewing.UI.Button.State.ACTIVE) {
        console.log("Transform button is clicked!");
        this.initialize();
        this.button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
      } else {
        console.log("Transform button is deactivated!");
        this.viewer.toolController.deactivateTool(this.tool.getName());
        this.button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
      }
    };

    this.group.addControl(this.button);
  }
}

// 註冊擴展
Autodesk.Viewing.theExtensionManager.registerExtension(
  "TransformExtension",
  TransformExtension
);
