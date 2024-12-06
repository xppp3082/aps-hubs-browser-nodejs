export class HistoryPanel extends Autodesk.Viewing.UI.PropertyPanel {
  constructor(extension, id, title) {
    super(extension.viewer.container, id, title);
    this.extension = extension;
    this.viewer = extension.viewer;
    this.container.style.height = "400px";
    this.container.style.width = "300px";
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

    // const historyContainer = document.createElement("div");
    // // historyContainer.style.height = "320px";
    // historyContainer.style.flex = "1";
    // historyContainer.overflowY = "auto";
    // historyContainer.style.position = "relative"; // 添加定位
    // historyContainer.style.backgroundColor = "white"; // 確保背景色

    // // 添加滾動條樣式
    // historyContainer.style.scrollbarWidth = "thin";
    // historyContainer.style.scrollbarColor = "#888 #f1f1f1"; // Firefox
    // // Webkit 瀏覽器的滾動條樣式
    // historyContainer.style.cssText += `
    //     &::-webkit-scrollbar {
    //         width: 6px;
    //     }
    //     &::-webkit-scrollbar-track {
    //         background: #f1f1f1;
    //     }
    //     &::-webkit-scrollbar-thumb {
    //         background: #888;
    //         border-radius: 3px;
    //     }
    //     &::-webkit-scrollbar-thumb:hover {
    //         background: #555;
    //     }
    // `;

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

        const time = new Date(action.timestamp).toLocaleString();
        const actionText =
          action.action === "move"
            ? `移動元件 ${action.dbid} 到 (${action.x}, ${action.y}, ${action.z})`
            : `刪除元件 ${action.dbid}`;

        item.innerHTML = `
              <div style="font-size: 12px; color: #666;">${time}</div>
              <div class="action-container">
                <div class="action-badge ${badgeClassName}">${action.action}</div>
                <div>${actionText}</div>
              </div>
            `;

        // 點擊歷史記錄項目時高亮顯示對應的元件
        item.onclick = () => {
          this.viewer.clearSelection();
          if (action.action === "move") {
            this.viewer.select(action.dbid);
            this.viewer.fitToView([action.dbid]);
          }
        };

        this.historyContainer.appendChild(item);
      });
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
        if (action.action === "move") {
          // 從 MongoDB 中取出來的 ID 還要進行型別轉換
          const dbIdInt = parseInt(action.dbid, 10);
          latestPositions.set(dbIdInt, {
            x: action.x,
            y: action.y,
            z: action.z,
          });
          // console.log(action.dbid);
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
