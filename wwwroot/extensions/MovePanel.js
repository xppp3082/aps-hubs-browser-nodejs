export class MovePanel extends Autodesk.Viewing.UI.PropertyPanel {
  constructor(extension, id, title) {
    // extension 表示擴充面板的功能實例 (Script)
    super(extension.viewer.container, id, title);
    this.extension = extension;
    this.selectedElement = null;
    this.viewer = extension.viewer;
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

    moveButton.onclick = () => {
      const x = parseFloat(xInput.querySelector("input").value);
      const y = parseFloat(yInput.querySelector("input").value);
      const z = parseFloat(zInput.querySelector("input").value);
      // const translation = new THREE.Vector3(x, y, z);
      // this.extension.moveElement(this.selectedElement, translation);
      this.extension.moveSelectedElement(x, y, z);
    };

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
  }

  // 負責移動元素到指定的 X、Y、Z 座標
  moveElement(dbId, x, y, z) {
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
      console.log(
        `fragment is now in (${fragProxy.position.x}, ${fragProxy.position.y}, ${fragProxy.position.z})`
      );
      fragProxy.position.set(x, y, z);
      console.log(`Move fragment ${fragId} to (${x}, ${y}, ${z})`);
      fragProxy.updateAnimTransform();
    });

    this.viewer.impl.sceneUpdated(true);
  }
}
