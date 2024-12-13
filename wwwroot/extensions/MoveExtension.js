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
      super.load(); // 等待父類別的 load 完成
      // this.panel = new MovePanel(this, "move-panel", "Move Elements");

      // await this.panel.initialize(); // 假設 initialize 可能需要時間
      await this.initializePanel();
      this.panel.setVisible(false);

      this.viewer.addEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        this.onSelectionChanged.bind(this)
      );

      // // 確保 viewer 已經加載模型
      // this.viewer.addEventListener(
      //   Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
      //   async () => {
      //     await this.updateViewFromDatabase();
      //   }
      // );
      return true;
    } catch (error) {
      console.error("Error loading MoveExtension:", error);
      return false;
    }
  }

  async unload() {
    try {
      super.unload(); // 等待父類別的 unload 完成

      if (this.panel) {
        this.panel.setVisible(false);
        this.panel.uninitialize(); // 假設 uninitialize 可能需要時間
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

      return true;
    } catch (error) {
      console.error("Error unloading MoveExtension:", error);
      return false;
    }
  }

  async initializePanel() {
    return new Promise((resolve) => {
      this.panel = new MovePanel(this, "move-panel", "Move Elements");
      this.panel.initialize(); // 初始化面板
      this.panel.setVisible(false);
      resolve();
    });
  }

  onToolbarCreated() {
    // this.panel.initialize();
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
    // console.log("完整事件物件:", event); // 直接出處事件物件
    // console.log("事件物件型別：", typeof event); // 輸出物件型別
    // console.log("事件物件結構：", JSON.stringify(event, null, 2)); // 格式化輸出

    // 檢查 panel 是否存在，如果不存在就重新初始化
    if (!this.panel) {
      // console.log("Panel not found, initializing...");
      this.panel = new MovePanel(this, "move-panel", "Move Elements");
      this.panel.initialize();
    }

    const dbIds = event.dbIdArray || [];
    // console.log(`Selection changed: ${dbIds[0]}`);
    if (dbIds.length > 0) {
      this.selectedDbId = dbIds[0];
      this.panel.setSelectedElement(this.selectedDbId);
      // console.log(`Selected object: ${this.selectedDbId}`);
    } else {
      this.selectedDbId = null;
      this.panel.setSelectedElement(null);
    }
  }

  moveSelectedElement = async (x, y, z, elementId) => {
    if (!this.selectedDbId) {
      console.error("No selected element for moving.");
      return;
    }

    const dbId = this.selectedDbId;
    const modelUrn = this.viewer.model.getData().urn;

    // 檢查資料庫中是否有這個 dbId 的歷史紀錄
    const response = await fetch(
      `/api/modelActions/${modelUrn}/history?dbid=${dbId}`
    );
    const { data } = await response.json();

    if (data && data.length > 0) {
      // 如果存在，更新該紀錄
      const existingAction = data[0]; // 假設只取第一個紀錄
      const updatedAction = {
        ...existingAction,
        x: existingAction.x + x, // 累加 x
        y: existingAction.y + y, // 累加 y
        z: existingAction.z + z, // 累加 z
        timestamp: new Date().toISOString(), // 更新時間戳
      };

      // 發送更新請求
      await fetch(`/api/modelActions/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedAction),
      });
      console.log(`Updated move action for dbId ${dbId}:`, updatedAction);
    } else {
      // 如果不存在，則插入新的紀錄
      const modelUrn = this.viewer.model.getData().urn;
      fetch("/api/modelActions/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urn: modelUrn,
          dbid: dbId,
          x,
          y,
          z,
          elementId: elementId,
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
          console.log("Move action recorded successfully:", data);
        })
        .catch((error) => {
          console.error("Error recording move action:", error);
        });
    }
    // 更新 Viewer 中的元件位置
    this.panel.moveElement(dbId, x, y, z);
  };

  async updateViewFromDatabase() {
    if (!this.viewer) {
      console.error("Viewer is not initialized.");
      return;
    }
    // if (!this.panel) {
    //   console.error("Panel is not initialized.");
    //   return;
    // }

    const modelUrn = this.viewer.model.getData().urn;
    console.log("Model URN From moveExtension.js:", modelUrn);
    const response = await fetch(`/api/modelActions/${modelUrn}/history`);
    if (!response.ok)
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    const { data } = await response.json();
    console.log("History data:", data);

    // 根據操作紀錄更新 3D 視圖
    for (const action of data) {
      if (action.action === "move") {
        console.log(action);
        // this.panel.moveElement(action.dbid, action.x, action.y, action.z);
        this.moveElement(action.dbid, action.x, action.y, action.z);
      }
      // } else if (action.action === "delete") {
      //   this.panel.deleteElement(action.dbid);
      // }
    }
  }

  // 負責移動元素到指定的 X、Y、Z 座標
  moveElement(dbId, x, y, z) {
    console.log("Start moving element:", dbId, x, y, z);
    try {
      const fragIds = [];
      this.viewer.model
        .getData()
        .instanceTree.enumNodeFragments(dbId, (fragId) => {
          fragIds.push(fragId);
        });

      fragIds.forEach((fragId) => {
        const fragProxy = this.viewer.impl.getFragmentProxy(
          this.viewer.model,
          fragId
        );
        fragProxy.getAnimTransform();

        // // 使用累加後的位置
        // fragProxy.position.set(x, y, z);

        console.log(
          `fragment is now in (${fragProxy.position.x}, ${fragProxy.position.y}, ${fragProxy.position.z})`
        );
        // fragProxy.position.set(x, y, z);
        fragProxy.position.set(x, y, z);
        fragProxy.updateAnimTransform();
      });
    } catch (error) {
      console.error("Error moving element:", error);
    }
    this.viewer.impl.sceneUpdated(true);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "MoveExtension",
  MoveExtension
);
