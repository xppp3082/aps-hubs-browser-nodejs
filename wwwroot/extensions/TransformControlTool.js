export class TransformControlTool extends Autodesk.Viewing.ToolInterface {
  constructor(viewer) {
    super();
    this.viewer = viewer;
    this.names = ["TransformControlTool"];
    this.transformControl = null;
    this.selectedMesh = null;
    this.active = false;
    this.isDragging = false;
    this.getName = () => {
      console.log("getName called");
      return "TransformControlTool";
    };
    // 在構造函數中綁定 activate
    this.activate = (name = this.getName()) => {
      console.log("TransformControlTool activate called with name:", name);
      try {
        this.active = true;
        if (!this.viewer) console.log("Viewer not initialized");
        this.viewer.select([]);

        // 創建場景和控制器，並先確保場景已經創建
        if (!this.viewer.impl.overlayScenes["transform-control"]) {
          this.viewer.impl.createOverlayScene("transform-control");
        }
        // 確保 camera 和 canvas 存在
        if (!this.viewer.impl.camera || !this.viewer.impl.canvas) {
          throw new Error("Camera or canvas not initialized");
        }

        this.transformControl = new THREE.TransformControls(
          this.viewer.impl.camera,
          this.viewer.impl.canvas
        );

        if (!this.transformControl) {
          throw new Error("Failed to create TransformControls");
        }
        this.transformControl.setMode("translate");

        // // 設置控制器大小
        // const bbox = this.viewer.model.getBoundingBox();
        // this.transformControl.setSize(bbox.getBoundingSphere().radius * 5);

        // // 創建和附加輔助網格
        // this.transformMesh = this.createTransformMesh();
        // this.transformControl.attach(this.transformMesh);

        // // 事件監聽
        // this.transformControl.addEventListener("dragging-changed", (event) => {
        //   this.isDragging = event.value;
        //   this.viewer.impl.controls.enabled = !this.isDragging;
        // });

        // this.transformControl.addEventListener("change", () => {
        //   this.onTxChange();
        //   this.viewer.impl.sceneUpdated(true);
        // });

        // this.viewer.impl.addOverlay("transform-control", this.transformControl);
        // this.transformControl.visible = true;

        // this.viewer.addEventListener(
        //   Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        //   this.onSelectionChanged.bind(this)
        // );

        console.log("TransformControlTool activate completed successfully");
        return true;
      } catch (error) {
        console.error("Error in TransformControlTool activate:", error);
        return false;
      }
    };

    // 同樣也可以綁定 deactivate
    this.deactivate = (name = this.getName()) => {
      console.log("TransformControlTool deactivate called with name:", name);
      try {
        this.active = false;
        if (this.transformControl) {
          this.viewer.impl.removeOverlay(
            "transform-control",
            this.transformControl
          );
          this.transformControl = null;
        }

        this.viewer.removeEventListener(
          Autodesk.Viewing.SELECTION_CHANGED_EVENT,
          this.onSelectionChanged.bind(this)
        );

        console.log("TransformControlTool deactivate completed successfully");
        return true;
      } catch (error) {
        console.error("Error in TransformControlTool deactivate:", error);
        return false;
      }
    };

    // this.createTransformMesh = () => {
    //   // 創建輔助網格
    //   console.log("createTransformMesh");
    //   const material = new THREE.MeshPhongMaterial({
    //     color: 0xffff00,
    //     transparent: true,
    //     opacity: 0.5,
    //   });

    //   const guid = new Date().getTime().toString();
    //   this.viewer.impl.matman().addMaterial(guid, material, true);

    //   const sphere = new THREE.Mesh(
    //     new THREE.SphereGeometry(0.0001, 5),
    //     material
    //   );
    //   sphere.position.set(0, 0, 0);
    //   return sphere;
    // };

    // this.onTxChange = () => {
    //   console.log("onTxChange");
    //   for (const fragId in this.selectedFragProxyMap) {
    //     const fragProxy = this.selectedFragProxyMap[fragId];

    //     const position = new THREE.Vector3(
    //       this.transformMesh.position.x - fragProxy.offset.x,
    //       this.transformMesh.position.y - fragProxy.offset.y,
    //       this.transformMesh.position.z - fragProxy.offset.z
    //     );

    //     fragProxy.position = position;
    //     fragProxy.updateAnimTransform();
    //   }
    // };
  }

  getName() {
    console.log("getName");
    return "TransformControlTool";
  }

  getNames() {
    return this.names;
  }
  // 創建輔助網格
  createTransformMesh() {
    console.log("createTransformMesh");
    const material = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
    });

    const guid = new Date().getTime().toString();
    this.viewer.impl.matman().addMaterial(guid, material, true);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.0001, 5),
      material
    );
    sphere.position.set(0, 0, 0);
    return sphere;
  }

  activate() {
    console.log("TransformControlTool activate......");
    try {
      console.log("TransformControlTool activate");

      this.active = true;
      this.viewer.select([]);

      // 創建場景和控制器
      this.viewer.impl.createOverlayScene("transform-control");
      console.log("createOverlayScene");
      this.transformControl = new THREE.TransformControls(
        this.viewer.impl.camera,
        this.viewer.impl.canvas
      );
      this.transformControl.setMode("translate");

      // 設置控制器大小
      const bbox = this.viewer.model.getBoundingBox();
      this.transformControl.setSize(bbox.getBoundingSphere().radius * 5);

      // 創建和附加輔助網格
      this.transformMesh = this.createTransformMesh();
      this.transformControl.attach(this.transformMesh);

      // 事件監聽
      this.transformControl.addEventListener("dragging-changed", (event) => {
        this.isDragging = event.value;
        this.viewer.impl.controls.enabled = !this.isDragging;
      });

      this.transformControl.addEventListener("change", () => {
        this.onTxChange();
        this.viewer.impl.sceneUpdated(true);
      });

      this.viewer.impl.addOverlay("transform-control", this.transformControl);
      this.transformControl.visible = false;

      this.viewer.addEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        this.onSelectionChanged.bind(this)
      );
      return true;
    } catch (error) {
      console.error("Error activating TransformControlTool:", error);
      return false;
    }
  }

  deactivate() {
    try {
      console.log("TransformControlTool deactivate");
      this.active = false;

      if (this.transformControl) {
        this.viewer.impl.removeOverlay(
          "transform-control",
          this.transformControl
        );
        this.transformControl = null;
      }

      this.viewer.removeEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        this.onSelectionChanged.bind(this)
      );
      return true;
    } catch (error) {
      console.error("Error deactivating TransformControlTool:", error);
      return false;
    }
  }

  // 其他必要的介面方法
  register() {
    console.log("TransformControlTool register");
    return true;
  }

  deregister() {
    console.log("TransformControlTool deregister");
    return true;
  }

  onTxChange() {
    console.log("onTxChange");
    for (const fragId in this.selectedFragProxyMap) {
      const fragProxy = this.selectedFragProxyMap[fragId];

      const position = new THREE.Vector3(
        this.transformMesh.position.x - fragProxy.offset.x,
        this.transformMesh.position.y - fragProxy.offset.y,
        this.transformMesh.position.z - fragProxy.offset.z
      );

      fragProxy.position = position;
      fragProxy.updateAnimTransform();
    }
  }

  getHitPoint(event) {
    console.log("getHitPoint");
    const viewport = this.viewer.navigation.getScreenViewport();
    const normalized = {
      x: (event.canvasX - viewport.left) / viewport.width,
      y: (event.canvasY - viewport.top) / viewport.height,
    };
    return this.viewer.utilities.getHitPoint(normalized.x, normalized.y);
  }

  handleButtonDown(event) {
    console.log("handleButtonDown");
    if (!this.active) return false;

    if (event.button === 0) {
      this.hitPoint = this.getHitPoint(event);

      if (this.hitPoint) {
        const viewport = this.viewer.impl.clientToViewport(
          event.canvasX,
          event.canvasY
        );
        const hitTest = this.viewer.impl.hitTest(viewport.x, viewport.y, true);

        if (hitTest) {
          this.viewer.select([hitTest.dbId]);
          return true;
        }
      }
    }
    return false;
  }

  onSelectionChanged(event) {
    console.log("onSelectionChanged");
    this.selectedFragProxyMap = {};

    if (!event.dbIdArray.length) {
      this.hitPoint = null;
      this.transformControl.visible = false;
      return;
    }

    if (this.hitPoint) {
      this.transformControl.visible = true;
      this.transformControl.position.copy(this.hitPoint);

      event.fragIdsArray.forEach((fragId) => {
        const fragProxy = this.viewer.impl.getFragmentProxy(
          this.viewer.model,
          fragId
        );

        fragProxy.getAnimTransform();

        const offset = {
          x: this.hitPoint.x - fragProxy.position.x,
          y: this.hitPoint.y - fragProxy.position.y,
          z: this.hitPoint.z - fragProxy.position.z,
        };

        fragProxy.offset = offset;
        this.selectedFragProxyMap[fragId] = fragProxy;
        this.modifiedFragIdMap[fragId] = {};
      });

      this.hitPoint = null;
    }
  }

  handleMouseMove(event) {
    console.log("handleMouseMove");
    if (!this.active || !this.isDragging) return false;
    return this.transformControl && this.transformControl.visible;
  }

  handleButtonUp() {
    console.log("handleButtonUp");
    if (!this.active) return false;
    this.isDragging = false;
    return false;
  }

  getPriority() {
    console.log("getPriority");
    return 1;
  }
}
