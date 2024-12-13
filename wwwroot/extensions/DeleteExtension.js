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

      this.viewer.addEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        this.onSelectionChanged.bind(this)
      );

      // 監聽鍵盤事件
      window.addEventListener("keydown", this.onKeyDown.bind(this));
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
      // console.log("DeleteExtension unloaded");
      return true;
    } catch (err) {
      console.error("Error unloading DeleteExtension:", error);
      return false;
    }
  }

  onToolbarCreated() {
    this.button = this.createToolbarButton(
      "delete-button",
      "https://img.icons8.com/?size=100&id=67884&format=png", // 刪除圖示
      "Delete Model Button"
    );
    this.button.onClick = () => {
      if (this.selectedDbId) {
        const confirmDelete = window.confirm(
          "Are you sure you want to delete the selected element?"
        );
        if (confirmDelete) {
          this.deleteElement(this.selectedDbId);
        }
      } else {
        alert("No element selected.");
      }
      // if (!this.panel) {
      //   this.panel = new DeletePanel(this, "delete-panel", "Delete Elements");
      //   this.panel.setVisible(false);
      //   this.panel.initialize();
      // }
      // this.panel.setVisible(!this.panel.isVisible());
      // this.button.setState(
      //   this.panel.isVisible()
      //     ? Autodesk.Viewing.UI.Button.State.ACTIVE
      //     : Autodesk.Viewing.UI.Button.State.INACTIVE
      // );
    };
  }

  // 鍵盤事件處理函數
  onKeyDown(event) {
    if (event.key === "Delete") {
      if (this.selectedDbId) {
        this.deleteElement(this.selectedDbId);
      }
    }
  }

  onSelectionChanged(event) {
    if (!this.panel) {
      // console.log("Panel not found, initializing...");
      this.panel = new DeletePanel(this, "delete-panel", "Delete Elements");
      this.panel.initialize();
    }

    const dbIds = event.dbIdArray || [];
    if (dbIds.length > 0) {
      this.selectedDbId = dbIds[0];
      this.panel.setSelectedElement(this.selectedDbId);
      // console.log(`Selection changed: ${this.selectedDbId}`);
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

  deleteElement(dbId) {
    if (dbId === null) {
      console.error("No element selected");
      return;
    }
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

    // 更新場景
    this.viewer.impl.invalidate(true);
    this.viewer.impl.sceneUpdated(true);
    console.log(`Element ${dbId} has been hidden`);

    const modelUrn = this.viewer.model.getData().urn;
    fetch("/api/modelActions/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urn: modelUrn,
        dbid: dbId,
        elementId: this.elementId,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(text);
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Delete action recorded successfully:", data);
      })
      .catch((error) => {
        console.error("Error recording delete action:", error);
      });

    // 清除選擇
    this.viewer.clearSelection();
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "DeleteExtension",
  DeleteExtension
);
