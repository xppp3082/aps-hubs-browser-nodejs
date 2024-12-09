export class HistoryPanel extends Autodesk.Viewing.UI.PropertyPanel {
  constructor(extension, id, title) {
    super(extension.viewer.container, id, title);
    this.extension = extension;
    this.viewer = extension.viewer;
    this.container.style.height = "300px";
    this.container.style.width = "350px";
    this.container.style.overflow = "hidden";
  }

  async createUI() {
    // 先清空容器
    this.container.innerHTML = "";

    // 創建主容器
    const container = document.createElement("div");
    container.style.background = "white";
    container.style.padding = "1rem";
    container.style.position = "relative";
    container.style.zIndex = "1";
    container.style.height = "calc(100% - 2rem)"; // 減去 padding 的空間
    container.style.display = "flex";
    container.style.flexDirection = "column";

    // 建立按鈕容器
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.alignItems = "center";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.padding = "0.5rem";
    buttonContainer.style.gap = "8px";

    // 刷新按鈕
    const refreshButton = document.createElement("button");
    refreshButton.innerHTML = '<i class="fas fa-sync"></i>'; // 使用 Font Awesome 的刷新圖示
    // refreshButton.textContent = "Refresh";
    refreshButton.onclick = () => {
      this.loadHistory();
    };

    // 同步按鈕
    const syncButton = document.createElement("button");
    syncButton.innerHTML = '<i class="fa-solid fa-forward-step"></i>'; // 使用 Font Awesome 的同步圖示
    // syncButton.textContent = "Sync Positioins";
    // syncButton.onclick = async () => {
    //   await this.syncModelWithDatabase();
    // };
    syncButton.onclick = () => {
      this.syncModelWithDatabase();
    };

    buttonContainer.appendChild(refreshButton);
    buttonContainer.appendChild(syncButton);

    const historyContainer = document.createElement("div");
    historyContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        position: relative;
        background-color: white;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 8px;
        max-height: calc(100% - 50px);
    `;

    this.historyContainer = historyContainer;

    container.appendChild(buttonContainer);
    container.appendChild(historyContainer);
    this.container.appendChild(container);

    await this.loadHistory();
  }

  async loadHistory() {
    const modelUrn = this.viewer.model.getData().urn;
    console.log("Model URN:", modelUrn);
    try {
      const response = await fetch(`/api/modelActions/${modelUrn}/history`);
      if (!response.ok)
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      const { data } = await response.json();
      console.log("History data:", data);
      this.displayHistory(data);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }

  displayHistory(actions) {
    if (!this.historyContainer) {
      console.error("historyContainer is not initialized");
      return;
    }
    console.log("開始渲染歷史記錄，數據量：", actions.length);

    this.historyContainer.innerHTML = "";
    actions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .forEach((action) => {
        const item = document.createElement("div");
        item.style.padding = "5px";
        item.style.margin = "5px 0";
        item.style.borderRadius = "4px";
        item.style.cursor = "pointer";
        item.style.position = "relative"; // 添加定位
        item.style.zIndex = "2"; // 確保在正確的層級

        let badgeClassName = "";
        // 根據動作類型設置不同的背景顏色
        if (action.action === "move") {
          item.style.backgroundColor = "#e3f2fd"; // 淺藍色
          badgeClassName = "move-action-badge";
        } else if (action.action === "delete") {
          item.style.backgroundColor = "#ffebee"; // 淺紅色
          badgeClassName = "delete-action-badge";
        }

        const unitConvertion = 30.48;
        const time = new Date(action.timestamp).toLocaleString();
        const actionText =
          action.action === "move"
            ? `移動元件 ${action.dbid} 到 (${action.x * unitConvertion}, ${
                action.y * unitConvertion
              }, ${action.z * unitConvertion})`
            : `刪除元件 ${action.dbid}`;

        item.innerHTML = `
              <div style="font-size: 12px; color: #666;">${time}</div>
              <div class="action-container">
                <div class="action-badge ${badgeClassName}">${action.action}</div>
                <div>${actionText}</div>
                  <span class="delete-history-icon" style="color: red; cursor: pointer; margin-left: 10px;">
                      <i class="fas fa-times"></i> <!-- 使用 Font Awesome 的叉叉圖示 -->
                  </span>              
              </div>
            `;

        // // 刪除按鈕的 hover 效果
        // const deleteButton = item.querySelector(".delete-history-button");
        const deleteButton = item.querySelector(".delete-history-icon");
        item.onmouseover = () => {
          deleteButton.style.display = "inline"; // 顯示刪除按鈕
        };
        item.onmouseout = () => {
          deleteButton.style.display = "none"; // 隱藏刪除按鈕
        };

        // 刪除按鈕的點擊事件
        deleteButton.onclick = async (event) => {
          event.stopPropagation(); // 防止觸發 item 的點擊事件
          await this.deleteAction(action._id); // 刪除動作
          this.loadHistory(); // 重新加載歷史記錄
        };

        // 點擊歷史記錄項目時高亮顯示對應的元件
        item.onclick = () => {
          this.viewer.clearSelection();
          if (action.action === "move") {
            this.viewer.select(action.dbid);
            this.viewer.fitToView([action.dbid]);
          } else if (action.action === "delete") {
            this.viewer.select(action.dbid);
            this.viewer.fitToView([action.dbid]);
          }
        };

        this.historyContainer.appendChild(item);
      });
  }

  // 刪除動作歷史
  async deleteAction(id) {
    const modelUrn = this.viewer.model.getData().urn;
    try {
      // 查詢資料庫以獲取該 document 的內容
      const response = await fetch(
        `/api/modelActions/${modelUrn}/getById?id=${id}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch action: ${response.statusText}`);
      }
      const { data } = await response.json();
      console.log("Action data:", data);
      if (data.length === 0) {
        console.error(
          `Action with ID ${id} not found in the database with collection name: ${modelUrn}.`
        );
        return;
      }

      const action = data[0];
      // 根據動作進行「反向操作」
      if (action.action === "delete") {
        this.viewer.show(action.dbid);
        console.log(`Element with ID ${action.dbid} is now visible.`);
      } else if (action.action === "move") {
        // 將元件移回原來的位置
        const resetPostision = { x: 0, y: 0, z: 0 };

        this.viewer.model
          .getData()
          .instanceTree.enumNodeFragments(action.dbid, (fragId) => {
            const fragProxy = this.viewer.impl.getFragmentProxy(
              this.viewer.model,
              fragId
            );
            fragProxy.getAnimTransform();
            fragProxy.position.set(
              resetPostision.x,
              resetPostision.y,
              resetPostision.z
            );
            fragProxy.updateAnimTransform();
          });
        console.log(
          `Element with ID ${action.dbid} has been moved back to (${resetPostision.x}, ${resetPostision.x}, ${resetPostision.x}).`
        );
      }

      //反向操作結束後，刪除紀錄
      const deleteResponse = await fetch(`/api/modelActions/deleteById`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urn: modelUrn,
          id: id,
        }),
      });

      if (!deleteResponse.ok) {
        throw new Error(
          `Failed to delete action: ${deleteResponse.statusText}`
        );
      }
      console.log(`Action with ID ${id} has been deleted from the database.`);
    } catch (error) {
      console.error("Error deleting action:", error);
    }
  }

  async syncModelWithDatabase() {
    const modelUrn = this.viewer.model.getData().urn;
    try {
      const response = await fetch(`/api/modelActions/${modelUrn}/history`);
      if (!response.ok) {
        throw new Error(`無法獲取歷史記錄：${response.statusText}`);
      }
      const { data } = await response.json();
      console.log("歷史記錄：", data);

      // 建立一個 Map 來存儲每個 dbId 的最新位置
      const latestPositions = new Map();

      // 遍歷所有動作，找出每個元件的最新位置
      data.forEach((action) => {
        // 從 MongoDB 中取出來的 ID 還要進行型別轉換
        const dbIdInt = parseInt(action.dbid, 10);
        if (action.action === "move") {
          latestPositions.set(dbIdInt, {
            x: action.x,
            y: action.y,
            z: action.z,
          });
          // console.log(action.dbid);
        } else if (action.action === "delete") {
          this.viewer.hide(dbIdInt);
        }
      });

      // 對每個元件應用最新位置
      for (const [dbId, position] of latestPositions) {
        const fragIds = [];
        this.viewer.model
          .getData()
          .instanceTree.enumNodeFragments(dbId, (fragId) => {
            fragIds.push(fragId);
          });

        console.log(`${position.x}, ${position.y}, ${position.z}`);
        console.log(fragIds.length);
        fragIds.forEach((fragId) => {
          const fragProxy = this.viewer.impl.getFragmentProxy(
            this.viewer.model,
            fragId
          );
          fragProxy.getAnimTransform();
          fragProxy.position.set(position.x, position.y, position.z);
          fragProxy.updateAnimTransform();
        });
      }
      this.viewer.impl.sceneUpdated(true);
      alert("模型位置已同步完成！");
    } catch (error) {
      console.error("同步過程發生錯誤：", error);
      alert("同步失敗，請查看控制台了解詳情。");
    }
  }

  initialize() {
    super.initialize();
    this.createUI();
  }
}
