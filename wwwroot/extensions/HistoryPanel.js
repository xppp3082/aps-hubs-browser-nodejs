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

    const container = document.createElement("div");
    container.style.background = "white";
    container.style.padding = "1rem";
    container.style.position = "relative";
    container.style.zIndex = "1";
    container.style.height = "calc(100% - 2rem)"; // 減去 padding 的空間
    container.style.display = "flex";
    container.style.flexDirection = "column";

    const refreshButton = document.createElement("button");
    refreshButton.textContent = "Refresh";
    refreshButton.style.marginBottom = "1rem";
    refreshButton.onclick = () => {
      this.loadHistory();
    };

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

    container.appendChild(refreshButton);
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

        // 根據動作類型設置不同的背景顏色
        if (action.action === "move") {
          item.style.backgroundColor = "#e3f2fd"; // 淺藍色
        } else if (action.action === "delete") {
          item.style.backgroundColor = "#ffebee"; // 淺紅色
        }

        const time = new Date(action.timestamp).toLocaleString();
        const actionText =
          action.action === "move"
            ? `移動元件 ${action.dbid} 到 (${action.x}, ${action.y}, ${action.z})`
            : `刪除元件 ${action.dbid}`;

        item.innerHTML = `
              <div style="font-size: 12px; color: #666;">${time}</div>
              <div>${actionText}</div>
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

  initialize() {
    super.initialize();
    this.createUI();
  }
}
