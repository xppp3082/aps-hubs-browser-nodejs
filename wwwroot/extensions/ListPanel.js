export class ListPanel extends Autodesk.Viewing.UI.PropertyPanel {
  constructor(extension, id, title) {
    super(extension.viewer.container, id, title);
    this.extension = extension;
    this.viewer = extension.viewer;
    this.container.style.height = "600px";
    this.container.style.width = "350px";
    // this.container.style.overflow = "hidden";
    this.categories = ["Revit Walls", "Revit Floors", "Revit Windows"];
  }

  initialize() {
    super.initialize();
    this.createUI();
  }

  async createUI(list = this.categories) {
    this.container.innerHTML = "";
    this.container.style.backgroundColor = "white";
    // 創造 Tab 容器
    const tabContainer = document.createElement("div");
    tabContainer.className = "panel-contianer";
    tabContainer.style.display = "flex";
    tabContainer.style.flexDirection = "column";
    this.container.appendChild(tabContainer);

    // 創造 tab title
    const tabTitle = document.createElement("div");
    tabTitle.textContent = "數量統計";
    tabTitle.className = "panel-title";
    tabTitle.style.display = "flex";
    // tabContainer.style.flexDirection = "column";
    tabContainer.appendChild(tabTitle);

    // 創造 Tab 標籤和內容區域
    const tabHeaders = document.createElement("div");
    tabHeaders.id = "tab-headers";
    tabHeaders.style.display = "flex";
    tabContainer.appendChild(tabHeaders);

    const tabContents = document.createElement("div");
    tabContents.id = "tab-contents";
    tabContents.style.flexGrow = "1";
    tabContainer.appendChild(tabContents);

    list.forEach((category) => {
      const tabHeader = document.createElement("button");
      tabHeader.textContent = category;
      tabHeader.className = "tab-button";
      tabHeader.onclick = async () => {
        Array.from(tabContents.children).forEach((content) => {
          content.style.display = "none";
        });
        const content = document.getElementById(`content-${category}`);
        if (content) {
          content.style.display = "block";
          this.collectAndDisplayElements(category, content);
        }
      };
      tabHeaders.appendChild(tabHeader);
      // 創建 Tab 內容
      const tabContent = document.createElement("div");
      tabContent.id = `content-${category}`;
      tabContent.style.display = "none";
      tabContents.appendChild(tabContent);
    });

    // 顯示第一個 tab 的內容
    if (list.length > 0) {
      const firstContent = document.getElementById(`content-${list[0]}`);
      if (firstContent) {
        firstContent.style.display = "block";
        await this.collectAndDisplayElements(list[0], firstContent);
      }
    }
  }

  async collectAndDisplayElements(category, content) {
    const viewer = this.viewer;
    content.innerHTML = ""; // 清空內容

    // 創建表格
    const table = document.createElement("table");
    const headerRow = document.createElement("tr");
    ["Type Name", "Count", "Area", "Volume"].forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    const typeCounts = {};

    // 遍歷 Viewer 中的所有節點
    const tree = await this.getObjectTreeAsync(viewer);
    const rootId = tree.getRootId();
    const dbIds = await this.getAllNodeChildrenAsync(tree, rootId);

    for (const dbId of dbIds) {
      const props = await this.getPropertiesAsync(viewer, dbId);

      const categoryProp = props.properties.find(
        (prop) => prop.displayName === "Category"
      );
      const typeNameProp = props.properties.find(
        (prop) => prop.displayName === "Type Name"
      );
      const areaProp = props.properties.find(
        (prop) => prop.displayName === "Area"
      );
      const volumeProp = props.properties.find(
        (prop) => prop.displayName === "Volume"
      );

      if (categoryProp && categoryProp.displayValue === category) {
        const typeName = typeNameProp ? typeNameProp.displayValue : "Unknown";
        if (!typeCounts[typeName]) {
          typeCounts[typeName] = { count: 0, area: 0, volume: 0 };
        }
        typeCounts[typeName].count += 1;
        if (areaProp) {
          typeCounts[typeName].area += parseFloat(areaProp.displayValue) || 0;
        }
        if (volumeProp) {
          typeCounts[typeName].volume +=
            parseFloat(volumeProp.displayValue) || 0;
        }
      }
    }

    // 填充表格
    for (const [typeName, data] of Object.entries(typeCounts)) {
      const row = document.createElement("tr");

      const typeCell = document.createElement("td");
      typeCell.textContent = typeName;
      row.appendChild(typeCell);

      const countCell = document.createElement("td");
      countCell.textContent = data.count;
      row.appendChild(countCell);

      const areaCell = document.createElement("td");
      areaCell.textContent = data.area > 0 ? data.area.toFixed(2) : "";
      row.appendChild(areaCell);

      const volumeCell = document.createElement("td");
      volumeCell.textContent = data.volume > 0 ? data.volume.toFixed(2) : "";
      row.appendChild(volumeCell);

      table.appendChild(row);
    }

    content.appendChild(table);
  }

  async getObjectTreeAsync(viewer) {
    return new Promise((resolve, reject) => {
      viewer.getObjectTree((tree) => resolve(tree));
    });
  }

  async getAllNodeChildrenAsync(tree, rootId) {
    return new Promise((resolve, reject) => {
      try {
        const dbIds = [];
        tree.enumNodeChildren(
          rootId,
          (dbId) => {
            dbIds.push(dbId);
          },
          true
        );
        resolve(dbIds);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getPropertiesAsync(viewer, dbId) {
    return new Promise((resolve, reject) => {
      viewer.getProperties(dbId, (props) => resolve(props));
    });
  }
}
