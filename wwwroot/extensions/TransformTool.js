export class TransformTool {
  constructor(viewer) {
    this.viewer = viewer;
    this.hitPoint = null;
    this.isDragging = false;
    this.transformMesh = null;
    this.modifiedFragIdMap = {};
    this.selectedFragProxyMap = {};
    this.transfromControlTx = null;
  }

  // 隨機 GUID 生成
  static guid() {
    const d = new Date().getTime();
    return "xxxx-xxxx-xxxx-xxxx-xxxx".replace(/[xy]/g, function (c) {
      const r = (d + Math.random() * 16) % 16 | 0;
      return (c === "x" ? r : (r & 0x7) | 0x8).toString(16);
    });
  }

  getName() {
    return "transform-tool";
  }

  getNames() {
    return ["transform-tool"];
  }

  createTransformMesh() {
    const material = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
    });
    this.viewer.impl.matman().addMaterial(TransformTool.guid(), material, true);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.0001, 5),
      material
    );

    sphere.position.set(0, 0, 0);
    return sphere;
  }

  onTxChange() {
    for (const fragId in this.selectedFragProxyMap) {
      const fragProxy = this.selectedFragProxyMap[fragId];

      let position = new THREE.Vector3(
        this.transformMesh.position.x - fragProxy.offset.x,
        this.transformMesh.position.y - fragProxy.offset.y,
        this.transformMesh.position.z - fragProxy.offset.z
      );

      fragProxy.position = position;
      //   fragProxy.position.copy(this.transformMesh.position);
      fragProxy.updateAnimTransform();
    }
    this.viewer.impl.sceneUpdated(true);
  }

  activate() {
    this.viewer.select([]);
    const bbox = this.viewer.model.getBoundingBox();
    this.viewer.impl.createOverlayScene("transform-tool");

    //
    this.transformControlTx = new THREE.TransformControls(
      this.viewer.impl.camera,
      this.viewer.impl.canvas,
      "translate"
    );

    //設定控制器大小
    this.transformControlTx.setSize(bbox.getBoundingSphere().radius * 5);
    this.transformControlTx.visible = false;

    this.viewer.impl.addOverlay("transform-tool", this.transformControlTx);

    this.transformMesh = this.createTransformMesh();
    this.transformControlTx.attach(this.transformMesh);

    this.viewer.addEventListener(
      Autodesk.Viewing.SELECTION_CHANGED_EVENT,
      this.onItemSelected.bind(this)
    );

    // this.viewer.addEventListener(
    //   Autodesk.Viewing.BUTTON_DOWN_EVENT,
    //   this.handleButtonDown(this)
    // );
  }

  deactivate() {
    this.viewer.impl.removeOverlayScene("transform-tool");
    this.transformControlTx = null;
    this.viewer.removeEventListener(
      Autodesk.Viewing.SELECTION_CHANGED_EVENT,
      this.onItemSelected.bind(this)
    );

    this.viewer.removeEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      this.onCameraChanged.bind(this)
    );

    // this.viewer.removeEventListener(
    //   Autodesk.Viewing.BUTTON_DOWN_EVENT,
    //   this.handleButtonDown.bind(this)
    // );
  }

  onCameraChanged() {
    this.transformControlTx.update();
    console.log("Camera Changed");
  }

  onItemSelected(event) {
    // 處理選中項目邏輯
    this.selectedFragProxyMap = {};

    console.log("Item Selected from TransformTool: ", event);
    if (!event.dbIdArray.length) {
      console.log("event.dbIdArray.length is 0");
      this.hitPoint = null;
      this.transformControlTx.visible = false;

      this.transformControlTx.removeEventListener("change", this.onTxChange);
      this.viewer.removeEventListener(
        Autodesk.Viewing.CAMERA_CHANGE_EVENT,
        this.onCameraChanged
      );
      return;
    }

    // if (this.hitPoint) {
    console.log(`this.hitPoint: ${this.hitPoint}`);
    this.transformControlTx.visible = true;
    this.transformControlTx.setPosition(this.hitPoint);
    this.transformControlTx.addEventListener("change", this.onTxChange);
    this.viewer.addEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      this.onCameraChanged
    );

    event.fragIdsArray.forEach((fragId) => {
      const fragProxy = this.viewer.impl.getFragmentProxy(
        this.viewer.model,
        fragId
      );

      fragProxy.getAnimTransform();
      let offset = {
        x: this.hitPoint.x - fragProxy.position.x,
        y: this.hitPoint.y - fragProxy.position.y,
        z: this.hitPoint.z - fragProxy.position.z,
      };

      fragProxy.offset = offset;
      this.selectedFragProxyMap[fragId] = fragProxy;
      this.modifiedFragIdMap[fragId] = {};
    });
    this.hitPoint = null;
    // }
    // else {
    //   this.transformControlTx.visible = false;
    // }
  }

  normalize(screenPoint) {
    let viewport = this.viewer.navigation.getScreenViewport();

    let n = {
      x: (screenPoint.x - viewport.left) / viewport.width,
      y: (screenPoint.y - viewport.top) / viewport.height,
    };
    return n;
  }

  getHitPoint(event) {
    console.log("Get Hit Point: ", event);
    let screenPoint = {
      x: event.clientX,
      y: event.clientY,
    };

    let n = this.normalize(screenPoint);
    let hitPoint = this.viewer.utilities.getHitPoint(n.x, n.y);

    return hitPoint;
  }

  getTransformMap = function () {
    let transformMap = {};

    for (let fragId in _modifiedFragIdMap) {
      let fragProxy = viewer.impl.getFragmentProxy(viewer.model, fragId);

      fragProxy.getAnimTransform();

      transformMap[fragId] = {
        position: fragProxy.position,
      };

      fragProxy = null;
    }

    return transformMap;
  };

  update = function (t) {
    return false;
  };

  handleSingleClick = function (event, button) {
    return false;
  };

  handleDoubleClick = function (event, button) {
    return false;
  };

  handleSingleTap = function (event) {
    return false;
  };

  handleDoubleTap = function (event) {
    return false;
  };

  handleKeyDown = function (event, keyCode) {
    return false;
  };

  handleKeyUp = function (event, keyCode) {
    return false;
  };

  handleWheelInput = function (delta) {
    return false;
  };

  //   handleButtonDown(event, button) {
  //     console.log("Button Down TO GET HIT POINT: ", event);
  //     this.hitPoint = this.getHitPoint(event);

  //     this.isDragging = true;

  //     if (this.transformControlTx.onPointerDown(event)) return true;

  //     //return _transRotControl.onPointerDown(event);
  //     return false;
  //   }

  handleButtonDown = function (event, button) {
    console.log("Button Down TO GET HIT POINT: ", event);
    this.hitPoint = getHitPoint(event);

    this.isDragging = true;

    if (this.transformControlTx.onPointerDown(event)) return true;

    //return _transRotControl.onPointerDown(event);
    return false;
  };

  handleButtonUp = function (event, button) {
    this.isDragging = false;

    if (this.transformControlTx.onPointerUp(event)) return true;

    //return _transRotControl.onPointerUp(event);
    return false;
  };

  hadleMouseMove = function (event) {
    if (this.isDragging) {
      if (this.transformControlTx.onPointerMove(event)) return true;

      //return _transRotControl.onPointerMove(event);
      return false;
    }
    if (this.transformControlTx.onPointerHover(event)) return true;
  };
  handleGesture = function (event) {
    return false;
  };

  handleBlur = function (event) {
    return false;
  };

  handleResize = function () {};
}
