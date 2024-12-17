import { TransformControlTool } from "./TransformControlTool.js";

class TransformControlExtension extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.tool = null;
    this.group = null;
    this.button = null;
  }

  initialize() {
    this.tool = new TransformControlTool(this.viewer);
    console.log(this.tool.getName());
    try {
      let isRegister = this.viewer.toolController.registerTool(this.tool);
      console.log("TransformControlTool registered successfully", isRegister);
    } catch (error) {
      console.error("Error registering tool:", error);
    }

    if (this.viewer.model.getInstanceTree()) {
      this.customize();
    } else {
      this.viewer.addEventListener(
        Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT,
        () => this.customize()
      );
    }
  }

  customize() {
    let isLock = this.viewer.toolController.getIsLocked();
    if (!isLock) {
      var isActivate = this.viewer.toolController.activateTool(
        this.tool.getName()
      );
    }
    const activeTool = this.viewer.toolController.getActiveTool();
    console.dir(activeTool);
    console.log(`Active tool name: ${activeTool.getName()}`);
    // 或者查看多個屬性
    console.log(`Tool details: 
      Name: ${activeTool.getName()}
      Active: ${activeTool.active}
      Is Dragging: ${activeTool.isDragging}
    `);
    console.log("The NewTransformControl activated:", isActivate);
  }

  async load() {
    return true;
  }

  async unload() {
    if (this.tool) {
      this.viewer.toolController.deactivateTool(this.tool.getName());
    }

    if (this.group) {
      this.group.removeControl(this.button);
      if (this.group.getNumberOfControls() === 0) {
        this.viewer.toolbar.removeControl(this.group);
      }
    }
    console.log("TransformControlExtension is now unloaded!");
    return true;
  }

  onToolbarCreated() {
    console.log("onToolbarCreated");
    this.group = this.viewer.toolbar.getControl(
      "transform-control-toolbar-group"
    );
    if (!this.group) {
      this.group = new Autodesk.Viewing.UI.ControlGroup(
        "transform-control-toolbar-group"
      );
      this.viewer.toolbar.addControl(this.group);
    }

    this.button = new Autodesk.Viewing.UI.Button("transformControlButton");
    this.button.icon.classList.add("fas", "fa-arrows-alt");
    this.button.setToolTip("Transform Control");

    this.button.onClick = () => {
      if (this.button.getState() !== Autodesk.Viewing.UI.Button.State.ACTIVE) {
        this.initialize();

        // 添加延遲檢查確保工具被正確激活
        setTimeout(() => {
          const activeTool = this.viewer.toolController.getActiveTool();
          if (!activeTool || !activeTool.active) {
            console.log("Retrying tool activation...");
            this.viewer.toolController.activateTool("TransformControlTool");
          }
        }, 3000);
        this.button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
      } else {
        console.log("Transform Control deactivated!");
        this.viewer.toolController.deactivateTool(this.tool.getName());
        this.button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
      }
    };

    this.group.addControl(this.button);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "TransformControlExtension",
  TransformControlExtension
);
