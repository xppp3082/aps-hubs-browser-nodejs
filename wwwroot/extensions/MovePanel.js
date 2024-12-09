export class MovePanel extends Autodesk.Viewing.UI.PropertyPanel {
  constructor(extension, id, title) {
    // extension 表示擴充面板的功能實例 (Script)
    super(extension.viewer.container, id, title);
    this.extension = extension;
    this.selectedElement = null;
    this.viewer = extension.viewer;
    this.currentPosition = {
      x: 0,
      y: 0,
      z: 0,
    };
  }

  createUI() {
    const container = document.createElement("div");
    container.style.background = "white";
    container.style.padding = "15px";

    const xInput = this.createInput("x");
    const yInput = this.createInput("y");
    const zInput = this.createInput("z");
    const moveButton = document.createElement("button");
    moveButton.textContent = "Move";

    // // 新增: 顯示當前位置
    // const currentPosDiv = document.createElement("div");
    // currentPosDiv.style.marginTop = "10px";
    // currentPosDiv.innerHTML = `Current Position: (${this.currentPosition.x}, ${this.currentPosition.y}, ${this.currentPosition.z})`;

    moveButton.onclick = () => {
      const x = parseFloat(xInput.querySelector("input").value) / 30.48;
      const y = parseFloat(yInput.querySelector("input").value) / 30.48;
      const z = parseFloat(zInput.querySelector("input").value) / 30.48;
      // const translation = new THREE.Vector3(x, y, z);
      // this.extension.moveElement(this.selectedElement, translation);
      this.extension.moveSelectedElement(x, y, z);
      // currentPosDiv.innerHTML = `Current Position: (${this.currentPosition.x}, ${this.currentPosition.y}, ${this.currentPosition.z})`;
    };
    // container.appendChild(currentPosDiv);
    container.appendChild(xInput);
    container.appendChild(yInput);
    container.appendChild(zInput);
    container.appendChild(moveButton);

    this.container.appendChild(container);
  }

  createInput(label) {
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "10px";

    const inputLabel = document.createElement("label");
    inputLabel.textContent = label;
    inputLabel.style.marginRight = "10px";

    const input = document.createElement("input");
    input.type = "number";
    input.style.width = "50px";

    wrapper.appendChild(inputLabel);
    wrapper.appendChild(input);

    return wrapper;
  }

  initialize() {
    super.initialize();
    this.createUI();
  }

  // 當選擇改變是，MoveExtension 會呼叫這個方法來更新 selectedElement
  setSelectedElement(dbId) {
    this.selectedElement = dbId;
    // 當選擇新元件時，獲取其當前位置
    if (dbId) {
      this.viewer.getProperties(dbId, (props) => {
        console.log("Revit properties:", props);
      });
      const fragIds = [];
      this.viewer.model
        .getData()
        .instanceTree.enumNodeFragments(dbId, (fragId) => {
          fragIds.push(fragId);
        });

      if (fragIds.length > 0) {
        const fragProxy = this.viewer.impl.getFragmentProxy(
          this.viewer.model,
          fragIds[0]
        );
        fragProxy.getAnimTransform();

        // 更新當前位置
        this.currentPosition = {
          x: fragProxy.position.x,
          y: fragProxy.position.y,
          z: fragProxy.position.z,
        };
        console.log("Current position:", this.currentPosition);

        // 獲取全域座標
        const worldPosition = this.getWorldPosition(fragProxy);
        console.log("World position:", worldPosition);
      }
    }
  }

  // 取得全域座標的方法
  getWorldPosition(fragProxy) {
    const matrix = new THREE.Matrix4();
    fragProxy.getWorldMatrix(matrix);
    const worldPosition = new THREE.Vector3();
    worldPosition.setFromMatrixPosition(matrix); // 從矩陣中提取位置
    return worldPosition;
  }

  // 負責移動元素到指定的 X、Y、Z 座標
  moveElement(dbId, x, y, z) {
    const fragIds = [];
    this.viewer.model
      .getData()
      .instanceTree.enumNodeFragments(dbId, (fragId) => {
        fragIds.push(fragId);
      });

    // 計算新位置（累加）
    this.currentPosition.x += x;
    this.currentPosition.y += y;
    this.currentPosition.z += z;

    fragIds.forEach((fragId) => {
      const fragProxy = this.viewer.impl.getFragmentProxy(
        this.viewer.model,
        fragId
      );
      fragProxy.getAnimTransform();

      // 使用累加後的位置
      fragProxy.position.set(
        this.currentPosition.x,
        this.currentPosition.y,
        this.currentPosition.z
      );

      console.log(
        `fragment is now in (${fragProxy.position.x}, ${fragProxy.position.y}, ${fragProxy.position.z})`
      );
      // fragProxy.position.set(x, y, z);
      fragProxy.position.set(
        this.currentPosition.x,
        this.currentPosition.y,
        this.currentPosition.z
      );
      console.log(
        `Move fragment ${fragId} to (${this.currentPosition.x}, ${this.currentPosition.y}, ${this.currentPosition.z})`
      );
      fragProxy.updateAnimTransform();
    });

    this.viewer.impl.sceneUpdated(true);
  }
}
