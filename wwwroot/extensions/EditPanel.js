export class EditPanel extends Autodesk.Viewing.UI.DockingPanel {
  constructor(extension, id, title, options) {
    super(extension.viewer.container, id, title);
    this.extension = extension;
    this.viewer = this.extension.viewer;
    this.container.style.height = (options.height || 800) + "px";
    this.container.style.width = (options.width || 400) + "px";
    this.container.style.zIndex = "100";
    this.container.style.left = (options.x || 0) + "px";
    this.container.style.top = (options.y || 0) + "px";
    this._swatch = null;
    this._presets = null;
  }

  async initialize() {
    console.log("Initialize EditPanel", this);
    const presets = await this.getPresets();
    this._presets = presets;
    console.log("presets", this._presets);

    await super.initialize();
    this.createUI();
  }

  async createUI() {
    this.container.innerHTML = "";
    this.container.style.backgroundColor = "white";

    //創建主容器
    const mainContainer = document.createElement("div");
    mainContainer.className = "main-container";
    mainContainer.style.padding = "10px";
    mainContainer.style.overflow = "auto";

    //創建樹狀結構容器
    const treeContainer = document.createElement("div");
    treeContainer.className = "tree-container";
    mainContainer.appendChild(treeContainer);

    //獲取並組織數據
    try {
      const categorizedElements = await this.getCategorizedElements();
      console.log("categorizedElements", categorizedElements);
      // 建立樹狀結構
      for (const [category, elements] of Object.entries(categorizedElements)) {
        const categoryDiv = this.createCategoryNode(category, elements);
        treeContainer.appendChild(categoryDiv);
      }
    } catch (error) {
      console.error("error", error.message);
    }

    this.container.appendChild(mainContainer);
  }

  async getCategorizedElements() {
    const categorizedElements = {};
    const tree = await this.getObjectTreeAsync(this.viewer);
    const rootId = tree.getRootId();
    const dbIds = await this.getAllNodeChildrenAsync(tree, rootId);

    for (const dbId of dbIds) {
      const props = await this.getPropertiesAsync(this.viewer, dbId);
      if (!props || !props.properties) continue;
      const categoryProp = props.properties.find(
        (prop) => prop.displayName === "Category"
      );
      const typeNameProp = props.properties.find(
        (prop) => prop.displayName === "Type Name"
      );
      const LevelProp = props.properties.find(
        (prop) =>
          prop.displayName === "Level" && prop.displayCategory === "Constraints"
      );

      if (categoryProp && typeNameProp) {
        const category = categoryProp.displayValue;
        const typeName = typeNameProp.displayValue;
        const level = LevelProp ? LevelProp.displayValue : "未指定樓層";

        if (!categorizedElements[category]) {
          categorizedElements[category] = [];
        }
        categorizedElements[category].push({
          dbId,
          typeName,
          level,
        });
      }
    }
    return categorizedElements;
  }

  createCategoryNode(category, elements) {
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "category-container";
    categoryDiv.style.marginBottom = "10px";

    const categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header";
    categoryHeader.style.cursor = "pointer";
    categoryHeader.style.padding = "5px";
    categoryHeader.style.backgroundColor = "#f0f0f0";
    categoryHeader.innerHTML = `
            <span class="toggle-icon">▶</span>
            <span>${category} (${elements.length})</span>
        `;

    const elementList = document.createElement("div");
    elementList.className = "element-list";
    elementList.style.display = "none";
    elementList.style.paddingLeft = "20px";

    let currentSelectedElement = null;
    // 按樓層組織元素
    const elementsByLevel = {};
    elements.forEach((elem) => {
      if (!elementsByLevel[elem.level]) {
        elementsByLevel[elem.level] = [];
      }
      elementsByLevel[elem.level].push(elem);
    });

    // 為每個樓層創建子節點
    Object.entries(elementsByLevel).forEach(([level, levelElements]) => {
      const levelDiv = document.createElement("div");
      levelDiv.className = "level-container";
      levelDiv.innerHTML = `<div class="level-header">${level}</div>`;

      levelElements.forEach((elem) => {
        const elementDiv = document.createElement("div");
        elementDiv.className = "element-item";
        elementDiv.style.padding = "3px";
        elementDiv.style.cursor = "pointer";
        elementDiv.textContent = elem.typeName;
        elementDiv.onclick = () => {
          if (currentSelectedElement) {
            currentSelectedElement.style.backgroundColor = ""; // 重置之前選中元素的顏色
          }
          elementDiv.style.backgroundColor = "#d3d3d3"; // 設置當前選中元素的顏色
          currentSelectedElement = elementDiv;
          this.highlightElement(elem.dbId);
        };

        // 監聽 3D viewer 的選擇變更事件
        this.viewer.addEventListener(
          Autodesk.Viewing.SELECTION_CHANGED_EVENT,
          (event) => {
            if (event.dbIdArray.length === 0 && currentSelectedElement) {
              currentSelectedElement.style.backgroundColor = ""; // 重置顏色
              currentSelectedElement = null;
            }
          }
        );

        //創建 ComboBox
        const comboBox = document.createElement("select");
        // const options = [
        //   "-",
        //   "退",
        //   "玻璃 [346703]",
        //   "紅磚 [347487]",
        //   "大理石 [348271]",
        //   "松木 [349055]",
        // ];
        // options.forEach((option) => {
        //   const opt = document.createElement("option");
        //   opt.value = option;
        //   opt.textContent = option;
        //   comboBox.appendChild(opt);
        // });

        for (let [key, value] of this._presets) {
          const opt = document.createElement("option");
          opt.value = key;
          opt.textContent = key;
          comboBox.appendChild(opt);
        }

        comboBox.onchange = () => {
          const selectedOption = comboBox.value;
          if (selectedOption == "退") {
            this.viewer.hide(elem.dbId);
            this.viewer.fitToView([elem.dbId]);
          } else if (selectedOption !== "-") {
            this.viewer.select(elem.dbId);
            // this.changeMaterial(elem.dbId, selectedOption);
            this.applyPreset(selectedOption, this.viewer.model, elem.dbId);
            this.viewer.fitToView([elem.dbId]);
          }
        };
        elementDiv.appendChild(comboBox);
        levelDiv.appendChild(elementDiv);
      });

      elementList.appendChild(levelDiv);
    });

    categoryHeader.onclick = () => {
      const isHidden = elementList.style.display === "none";
      elementList.style.display = isHidden ? "block" : "none";
      categoryHeader.querySelector(".toggle-icon").textContent = isHidden
        ? "▼"
        : "▶";
    };

    categoryDiv.appendChild(categoryHeader);
    categoryDiv.appendChild(elementList);
    return categoryDiv;
  }

  async applyPreset(name, targetModel, targetObjectId) {
    if (!this._presets.has(name)) {
      console.error(`Preset ${name} not found`);
      return;
    }
    const material = this._presets.get(name);
    const tree = targetModel.getInstanceTree();
    const frags = targetModel.getFragmentList();
    tree.enumNodeFragments(
      targetObjectId,
      function (fragid) {
        frags.setMaterial(fragid, material);
      },
      true
    );
    targetModel.unconsolidate();
  }

  async loadModelMaterial() {
    // const urn = this.viewer.model.getData().urn;
    const urn =
      "dXJuOmFkc2sud2lwcHJvZDpmcy5maWxlOnZmLkZmZEVHOGxSU0tDY2pJclpENDl3TEE_dmVyc2lvbj0x";
    const viewer = this.viewer;
    return new Promise(function (resolve, reject) {
      function onSuccess(doc) {
        const viewable = doc.getRoot().getDefaultGeometry();
        viewer.addEventListener(
          Autodesk.Viewing.TEXTURES_LOADED_EVENT,
          function (ev) {
            if (ev.model._isSwatch) {
              resolve(ev.model);
            }
          }
        );
        viewer
          .loadDocumentNode(doc, viewable, {
            preserveView: true,
            keepCurrentModels: true,
            loadAsHidden: true, // <-- I see what you did there <_<
          })
          .then((model) => (model._isSwatch = true));
      }
      function onError(code, msg) {
        reject(msg);
      }
      Autodesk.Viewing.Document.load("urn:" + urn, onSuccess, onError);
    });
  }

  async getPresets() {
    if (!this._swatch) {
      this._swatch = await this.loadModelMaterial();
    }
    console.log("start finding swatch");
    const presets = new Map();
    presets.set("-", null);
    const tree = this._swatch.getInstanceTree();
    const frags = this._swatch.getFragmentList();
    tree.enumNodeChildren(
      tree.getRootId(),
      function (dbid) {
        if (tree.getChildCount(dbid) === 0) {
          const name = tree.getNodeName(dbid);
          tree.enumNodeFragments(
            dbid,
            function (fragid) {
              if (!presets.has(name)) {
                presets.set(name, frags.getMaterial(fragid));
              }
            },
            true
          );
        }
      },
      true
    );
    return presets;
  }

  highlightElement(dbId) {
    // this.viewer.isolate(dbId);
    this.viewer.fitToView([dbId]);
    this.viewer.select(dbId);
  }

  // 取得元件樹
  async getObjectTreeAsync(viewer) {
    // getObjectTree 和 getInstanceTree 的差別
    // getObjectTree 是取得所有節點，且是異步方法
    // getInstanceTree 是取得所有節點的實例，且是同步方法

    // return new Promise((resolve, reject) => {
    //   try {
    //     console.log("getObjectTreeAsync");
    //     viewer.getObjectTree((tree) => resolve(tree));
    //   } catch (error) {
    //     reject(error);
    //   }
    // });
    return viewer.model.getInstanceTree();
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
      try {
        viewer.getProperties(dbId, (props) => resolve(props));
      } catch (error) {
        reject(error);
      }
    });
  }

  findSpecificProperty(dbId, propertyName) {
    if (dbId) {
      this.viewer.getProperties(dbId, (props) => {
        const elementIdProperty = props.properties.find(
          (prop) => prop.attributeName === propertyName
        );
        if (elementIdProperty) {
          return elementIdProperty;
        } else {
          console.error(`failed to find specific property: ${propertyName}`);
          return null;
        }
      });
    }
  }
}
