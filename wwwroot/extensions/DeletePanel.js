export class DeletePanel extends Autodesk.Viewing.UI.PropertyPanel {
  constructor(extension, id, title) {
    super(extension.viewer.container, id, title);
    this.extension = extension;
    this.selectedElement = null;
    this.viewer = extension.viewer;
  }

  createUI() {
    const container = document.createElement("div");
    container.style.background = "white";
    container.style.padding = "15px";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete Selected Element";
    deleteButton.style.backgroundColor = "#ff4444";
    deleteButton.style.color = "white";
    deleteButton.style.padding = "8px 15px";
    deleteButton.style.border = "none";
    deleteButton.style.borderRadius = "4px";
    deleteButton.style.cursor = "pointer";

    deleteButton.onclick = () => {
      if (this.selectedElement) {
        const confirmDelete = window.confirm(
          "Are you sure you want to delete the selected element?"
        );
        if (confirmDelete) {
          //   this.deleteElement(this.selectedElement);
          this.extension.deleteSelectedElement();
        }
      } else {
        alert("No element selected.");
      }
    };

    container.appendChild(deleteButton);
    this.container.appendChild(container);
  }

  initialize() {
    super.initialize();
    this.createUI();
  }

  setSelectedElement(dbId) {
    this.selectedElement = dbId;
  }

  deleteElement(dbId) {
    const fragIds = [];
    this.viewer.model
      .getData()
      .instanceTree.enumNodeFragments(dbId, (fragId) => {
        fragIds.push(fragId);
      });

    // // 隱藏所有相關的片段 (沒辦法直接刪除嗎?)
    // fragIds.forEach((fragId) => {
    //   this.viewer.hide(dbId);
    // });

    this.viewer.hide(dbId);

    // 更新場警
    this.viewer.impl.invalidate(true);
    this.viewer.impl.sceneUpdated(true);
    console.log(`Element ${dbId} has been hidden`);

    // 清除選擇
    this.viewer.clearSelection();
  }
}
