// 基礎的 View Extension
export class BaseExtension extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    // 當模型創建時觸發，通常在模型加載後完成
    this._onObjectTreeCreated = (ev) => this.onModelLoaded(ev.model);
    // 當使用者在視圖中選取物件時觸發
    this._onSelectionChanged = (ev) =>
      this.onSelectionChanged(ev.model, ev.dbIdArray);
    // 當使用者在視圖中隔離物件時觸發 => 例如只顯示特定部分或隱藏其他部分
    this._onIsolateChanged = (ev) =>
      this.onIsolateChanged(ev.model, ev.nodeIdArray);
  }

  load() {
    // this.viewer.addEventListener(
    //   Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT,
    //   (ev) => {
    //     // console.log(
    //     //   "Event callback this instanceof BaseExtension:",
    //     //   this instanceof BaseExtension
    //     // );
    //     // console.log("Event callback this:", this);
    //     this._onObjectTreeCreated(ev);
    //   }
    // );

    this.viewer.addEventListener(
      Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT,
      this._onObjectTreeCreated
    );
    this.viewer.addEventListener(
      Autodesk.Viewing.SELECTION_CHANGED_EVENT,
      this._onSelectionChanged
    );
    this.viewer.addEventListener(
      Autodesk.Viewing.ISOLATE_EVENT,
      this._onIsolateChanged
    );
    return true; // return true to indicate successful loading
  }

  unload() {
    this.viewer.removeEventListener(
      Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT,
      this._onObjectTreeCreated
    );
    this.viewer.removeEventListener(
      Autodesk.Viewing.SELECTION_CHANGED_EVENT,
      this._onSelectionChanged
    );
    this.viewer.removeEventListener(
      Autodesk.Viewing.ISOLATE_EVENT,
      this._onIsolateChanged
    );
    return true; // return true to indicate successful unloading
  }

  onModelLoaded(model) {}
  onSelectionChanged(model, dbIds) {}
  onIsolateChanged(model, dbIds) {}

  // 用來尋找模型中所有的葉節點，也就是沒有子節點的節點
  findLeafNodes(model) {
    return new Promise((resolve, reject) => {
      model.getObjectTree(function (tree) {
        let leaves = [];
        tree.enumNodeChildren(
          tree.getRootId(),
          function (dbId) {
            if (tree.getChildCount(dbId) === 0) {
              leaves.push(dbId);
            }
          },
          true
        );
        resolve(leaves);
      }, reject);
    });
  }

  async findPropertyNames(model) {
    const dbIds = await this.findLeafNodes(model);
    return new Promise((resolve, reject) => {
      model.getBulkProperties(
        dbIds,
        {},
        (elements) => {
          // 使用 Set 來確保屬性名稱不重複
          const properties = new Set();
          elements.forEach((element) => {
            Object.keys(element.properties).forEach((prop) =>
              properties.add(prop)
            );
          });
          // 完成後轉換為陣列並回傳，透過 Promise.resolve 來包裝，可以透過 await 或 .then 來取得結果
          resolve(properties);
        },
        reject
      );
    });
  }

  createToolbarButton(buttonId, buttonIconUrl, buttonTooltip) {
    let group = this.viewer.toolbar.getControl("dashboard-toolbar-group");
    if (!group) {
      group = new Autodesk.Viewing.UI.ControlGroup("dashboard-toolbar-group");
      this.viewer.toolbar.addControl(group);
    }
    const button = new Autodesk.Viewing.UI.Button(buttonId);
    button.setToolTip(buttonTooltip);
    group.addControl(button);
    const icon = button.container.querySelector(".adsk-button-icon");
    if (icon) {
      icon.style.backgroundImage = `url(${buttonIconUrl})`;
      icon.style.backgroundSize = `24px`;
      icon.style.backgroundRepeat = `no-repeat`;
      icon.style.backgroundPosition = `center`;
    }
    return button;
  }

  removeToolbarButton(button) {
    let group = this.viewer.toolbar.getControl("dashboard-toolbar-group");
    if (group) group.removeControl(button);
  }

  // 需要等待外部資源下載完成，且加載時間不確定，所以使用 Promise 來處理非同步
  loadScript(url, namespace) {
    if (window[namespace] !== undefined) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 創建一個 function 用來動態加載 CSS 檔案
  // 需要等待外部資源下載完成，且加載時間不確定，所以使用 Promise 來處理非同步
  loadStyleSheet(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }
}
