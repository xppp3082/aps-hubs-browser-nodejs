import { viewerUtils } from "../utils/viewerUtils.js";
// import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BufferGeometryUtils } from "https://cdn.jsdelivr.net/npm/three@0.125.2/examples/jsm/utils/BufferGeometryUtils.js";
// import * as BufferGeometryUtils from "https://unpkg.com/three@0.153.0/examples/jsm/utils/BufferGeometryUtils.js";

AutodeskNamespace("Autodesk.ADN.Viewing.Extension");

Autodesk.ADN.Viewing.Extension.CopyAxisTool = function (viewer, options) {
  function CopyAxisTool() {
    var _hitPoint = null;
    var _isDragging = false;
    var _transformMesh = null;
    var _modifiedFragIdMap = {};
    var _selectedFragProxyMap = {};
    var _transformControlTx = null;
    var _clickAxis = null;
    var _selectedDbId = null;
    var _isActivated = true;
    var _selectedElementId = null;
    var _sceneBuilder = null;

    function createTransformMesh() {
      var material = new THREE.MeshPhongMaterial({ color: 0xff0000 });

      viewer.impl.matman().addMaterial(guid(), material, true);

      var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.0001, 5),
        material
      );

      sphere.position.set(0, 0, 0);

      return sphere;
    }

    function onTxChange() {
      for (var fragId in _selectedFragProxyMap) {
        var fragProxy = _selectedFragProxyMap[fragId];

        var targetPosition = new THREE.Vector3(
          _transformMesh.position.x - fragProxy.offset.x,
          _transformMesh.position.y - fragProxy.offset.y,
          _transformMesh.position.z - fragProxy.offset.z
        );
        fragProxy.position = targetPosition;
        fragProxy.updateAnimTransform();
      }

      viewer.impl.sceneUpdated(true);
    }

    function onCameraChanged() {
      _transformControlTx.update();
    }

    async function onItemSelected(event) {
      if (!_isActivated) return;
      if (!event.dbIdArray || event.dbIdArray.length === 0 || _clickAxis) {
        viewer.select([_selectedDbId]);
        console.log("Clicked on empty space, ignoring...");
        return;
      }

      _selectedFragProxyMap = {};
      // 取得當前選取物件的 dbId
      console.log("onItemSelected: ", event);
      const dbIds = event.dbIdArray;
      if (dbIds && dbIds.length > 0) {
        const dbId = dbIds[0];
        _selectedDbId = dbId;
        _selectedElementId = await viewerUtils.getElementId(viewer, dbId);
      }

      // component unselected
      if (!event.fragIdsArray.length) {
        _hitPoint = null;
        _transformControlTx.visible = false;
        _transformControlTx.removeEventListener("change", onTxChange);
        viewer.select([]);
        viewer.removeEventListener(
          Autodesk.Viewing.CAMERA_CHANGE_EVENT,
          onCameraChanged
        );
        return;
      }

      if (_hitPoint) {
        _transformControlTx.visible = true;
        _transformControlTx.setPosition(_hitPoint);
        _transformControlTx.addEventListener("change", onTxChange);
        viewer.addEventListener(
          Autodesk.Viewing.CAMERA_CHANGE_EVENT,
          onCameraChanged
        );

        event.fragIdsArray.forEach(function (fragId) {
          var fragProxy = viewer.impl.getFragmentProxy(viewer.model, fragId);
          fragProxy.getAnimTransform();

          var offset = {
            x: _hitPoint.x - fragProxy.position.x,
            y: _hitPoint.y - fragProxy.position.y,
            z: _hitPoint.z - fragProxy.position.z,
          };

          fragProxy.offset = offset;
          _selectedFragProxyMap[fragId] = fragProxy;
          console.log("Selected fragProxy: ", fragProxy);
          _modifiedFragIdMap[fragId] = {};
        });

        _hitPoint = null;
      } else {
        _transformControlTx.visible = false;
      }
    }

    function normalize(screenPoint) {
      var viewport = viewer.navigation.getScreenViewport();

      var n = {
        x: (screenPoint.x - viewport.left) / viewport.width,
        y: (screenPoint.y - viewport.top) / viewport.height,
      };

      return n;
    }

    function getHitPoint(event) {
      var screenPoint = {
        x: event.clientX,
        y: event.clientY,
      };

      var n = normalize(screenPoint);

      var hitPoint = viewer.utilities.getHitPoint(n.x, n.y);

      return hitPoint;
    }

    function onArrowClick(direction, screenPoint) {
      const inputBox = document.createElement("input");
      inputBox.id = "copyAxisInputBox";
      inputBox.type = "number";
      inputBox.placeholder = `請輸入往 ${direction} 軸的移動距離 (cm)`;

      // 設置輸入框的位置為滑鼠點擊的位置
      inputBox.style.position = "absolute";
      inputBox.style.left = `${screenPoint.x}px`;
      inputBox.style.top = `${screenPoint.y}px`;
      inputBox.style.zIndex = 1000;

      document.body.appendChild(inputBox);
      inputBox.focus();

      inputBox.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          const distance = parseFloat(inputBox.value);
          if (!isNaN(distance)) {
            copyElement(direction, distance);
          } else {
            console.error("Invalid input, please enter a number");
          }
          document.body.removeChild(inputBox);
          // _transformControlTx.enabled = true;
          _clickAxis = null;
        }
      });

      // 全局監聽鍵盤事件
      const handleGlobalKeyDown = (event) => {
        if (event.key === "Escape") {
          if (inputBox !== null) {
            document.body.removeChild(inputBox);
          }
          viewer.update();
          document.removeEventListener("keydown", handleGlobalKeyDown); // 移除全局事件監聽
          _clickAxis = null;
        }
      };

      document.addEventListener("keydown", handleGlobalKeyDown); // 添加全局事件監聽
    }

    function copyElement(direction, distance) {
      const copyVector = new THREE.Vector3();
      const convertedDistance = viewerUtils.convertUnitBasedOnModel(
        viewer,
        distance
      );
      switch (direction) {
        case "X":
          copyVector.set(convertedDistance, 0, 0);
          break;
        case "Y":
          copyVector.set(0, convertedDistance, 0);
          break;
        case "Z":
          copyVector.set(0, 0, convertedDistance);
          break;
        default:
          alert("Invalid direction, please click on the right axis.");
          console.error("Invalid direction");
          return;
      }
      // console.log("original _transformMesh: ", _transformMesh);
      const newPosition = _transformMesh.position.clone().add(copyVector);
      const moveVector = new THREE.Vector3(
        newPosition.x - _transformMesh.position.x,
        newPosition.y - _transformMesh.position.y,
        newPosition.z - _transformMesh.position.z
      );
      // console.log("newPosition: ", newPosition);
      // _transformMesh.position.add(copyVector);
      // onTxChange();
      // createCloneObject(moveVector);
      createCloneObject(copyVector);
      //   onTxChange(); //更新位置
    }

    function initializeSceneBuilder() {
      if (!_sceneBuilder) {
        _sceneBuilder = viewer.getExtension("Autodesk.Viewing.SceneBuilder");
        if (!_sceneBuilder) {
          console.error("SceneBuilder extension is not loaded.");
        }
      }
    }

    async function createCloneObject(newPosition) {
      // 用於儲存新創建的 fragments
      initializeSceneBuilder();
      console.log("createCloneObject: ", _sceneBuilder);
      const modelBuilder = await _sceneBuilder.addNewModel({
        conserveMemory: false,
        modelNameOverride: "My Model Name",
      });
      try {
        const mergedGeometry = convertDbIdToBufferGeometry(
          viewer,
          _selectedDbId,
          modelBuilder
        );
        alert("createCloneObject success");
      } catch (error) {
        console.error("Error in createCloneObject:", error);
        throw error;
      }
    }

    function convertDbIdToBufferGeometry(viewer, dbId, modelBuilder) {
      //  獲取實體對應的所有 Fragment Ids
      const instanceTree = viewer.model.getData().instanceTree;
      const fragIds = [];
      instanceTree.enumNodeFragments(dbId, (fragId) => {
        fragIds.push(fragId);
      });

      // 檢查是否存在 fragment Id
      if (fragIds.length === 0) {
        console.error("No fragment Ids found for dbId: ", dbId);
        return null;
      }

      // 創建一個新的 BufferGeometry 對象
      const red = new THREE.MeshPhongMaterial({
        color: new THREE.Color(1, 0, 0),
      });
      const torus = new THREE.BufferGeometry().fromGeometry(
        new THREE.TorusGeometry(10, 2, 32, 32)
      );
      const transform = new THREE.Matrix4().compose(
        new THREE.Vector3(19, 0, 0),
        new THREE.Quaternion(0, 0, 0, 1),
        new THREE.Vector3(1, 1, 1)
      );

      const finalMesh = new THREE.Mesh(torus, red);
      finalMesh.matrix = transform;
      console.log("finalMesh: ", finalMesh);
      const isSuccess = modelBuilder.addMesh(finalMesh);
      console.log("simple addMesh created: ", isSuccess);

      // 遍歷所有 fragmentID，提取幾何
      for (const fragId of fragIds) {
        console.log("fragId: ", fragId);
        const renderProxy = viewer.impl.getRenderProxy(viewer.model, fragId);
        const bufferMesh = new THREE.Mesh(renderProxy.geometry, red);
        console.log(typeof bufferMesh);
        bufferMesh.matrix = transform;
        console.log("renderProxy: ", renderProxy);
        console.log("bufferMesh: ", bufferMesh);
        const isSuccess = modelBuilder.addMesh(bufferMesh);
        console.log("fragId addMesh created: ", isSuccess);
      }

      for (let i = 0; i < 5; i++) {
        const size = Math.random() * 5 + 1;
        const position = new THREE.Vector3(
          Math.random() * 500 - 250,
          Math.random() * 500 - 250,
          Math.random() * 500 - 250
        );
        const cubeGeometry = new THREE.BoxGeometry(size, size, size);
        const bufferCube = new THREE.BufferGeometry().fromGeometry(
          cubeGeometry
        );
        const cubeMaterial = new THREE.MeshPhongMaterial({
          color: new THREE.Color(Math.random(), Math.random(), Math.random()), // 隨機顏色
        });

        const cubeMesh = new THREE.Mesh(bufferCube, cubeMaterial);
        cubeMesh.position.copy(position);

        const isSuccess = modelBuilder.addMesh(cubeMesh);
        console.log(`Cube ${i + 1} added: `, isSuccess);
      }

      return finalMesh;
    }

    function createMergedMesh() {
      let geometries = [];
      const renderProxy = viewer.impl.getRenderProxy(
        viewer.model,
        _selectedDbId
      );
      geometries.push(renderProxy.geometry);
    }

    function cleanupClonedObjects() {
      if (_sceneBuilder) {
        _sceneBuilder.clearScene();
        viewer.impl.invalidate(true);
      }
    }

    this.getTransformMap = function () {
      var transformMap = {};

      for (var fragId in _modifiedFragIdMap) {
        var fragProxy = viewer.impl.getFragmentProxy(viewer.model, fragId);

        fragProxy.getAnimTransform();

        transformMap[fragId] = {
          position: fragProxy.position,
        };

        fragProxy = null;
      }

      return transformMap;
    };

    this.getNames = function () {
      return ["Dotty.Viewing.Tool.CopyAxisTool"];
    };

    this.getName = function () {
      return "Dotty.Viewing.Tool.CopyAxisTool";
    };

    this.activate = function () {
      viewer.select([]);
      console.log("CopyAxisTool activate");
      var bbox = viewer.model.getBoundingBox();

      viewer.impl.createOverlayScene("Dotty.Viewing.Tool.CopyAxisTool");

      _transformControlTx = new THREE.TransformControls(
        viewer.impl.camera,
        viewer.impl.canvas,
        "translate"
      );

      _transformControlTx.setSize(bbox.getBoundingSphere().radius * 5);

      _transformControlTx.visible = false;

      viewer.impl.addOverlay(
        "Dotty.Viewing.Tool.CopyAxisTool",
        _transformControlTx
      );

      _transformMesh = createTransformMesh();

      _transformControlTx.attach(_transformMesh);

      viewer.addEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        onItemSelected
      );
    };

    this.deactivate = function () {
      viewer.impl.removeOverlay(
        "Dotty.Viewing.Tool.CopyAxisTool",
        _transformControlTx
      );

      _transformControlTx.removeEventListener("change", onTxChange);

      viewer.impl.removeOverlayScene("Dotty.Viewing.Tool.CopyAxisTool");

      viewer.removeEventListener(
        Autodesk.Viewing.CAMERA_CHANGE_EVENT,
        onCameraChanged
      );
      console.log("CopyAxisTool deactivate");

      viewer.removeEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        onItemSelected
      );
      // _transformControlTx = null;
      _isActivated = false;
    };

    this.update = function (t) {
      return false;
    };

    this.handleSingleClick = function (event, button) {
      return false;
    };

    this.handleDoubleClick = function (event, button) {
      return false;
    };

    this.handleSingleTap = function (event) {
      return false;
    };

    this.handleDoubleTap = function (event) {
      return false;
    };

    this.handleKeyDown = function (event, keyCode) {
      if (keyCode === 27) {
        // 27 是 ESC 鍵的 keyCode
        viewer.clearSelection(); // 清除所有選取
        return true;
      }
      return false;
    };

    this.handleKeyUp = function (event, keyCode) {
      return false;
    };

    this.handleWheelInput = function (delta) {
      return false;
    };

    this.handleButtonDown = function (event, button) {
      console.log("handleButtonDown: ", event, _transformControlTx.axis);
      if (_transformControlTx.axis === null) {
        _hitPoint = getHitPoint(event);
      }
      _isDragging = false;
      if (_transformControlTx.onPointerDown(event)) {
        console.log("onPointerDown: ", event);
        const axis = _transformControlTx.axis;
        _clickAxis = axis;
        if (axis) {
          console.log("onPointerDown on TransformControls: ", axis);
          // 阻止事件繼續傳播
          event.stopPropagation();
          // 阻止默認行為
          event.preventDefault();

          onArrowClick(axis, { x: event.clientX, y: event.clientY });
        }
        return true;
      }
      return false;
    };

    this.handleButtonUp = function (event, button) {
      _isDragging = false;
      if (_transformControlTx.onPointerUp(event)) {
        console.log("onPointerUp: ", event);
        return true;
      }
      //return _transRotControl.onPointerUp(event);
      return false;
    };

    let totalDistanceMoved = new THREE.Vector3(); //用於紀錄移動距離

    this.handleMouseMove = function (event) {
      if (_isDragging) {
        const prevoiusHitPoint = _transformControlTx.position.clone();

        if (_transformControlTx.onPointerMove(event)) {
          const currentHitPoint = _transformControlTx.position; // 獲取當前位置
          const distanceMoved = currentHitPoint.clone().sub(prevoiusHitPoint); // 計算移動距離
          totalDistanceMoved.add(distanceMoved); // 累加移動距離

          console.log("CopyAxisTool onPointerMove: ", event);
          return true;
        }

        return false;
      }

      if (_transformControlTx.onPointerHover(event)) return true;

      //return _transRotControl.onPointerHover(event);
      return false;
    };

    this.handleGesture = function (event) {
      return false;
    };

    this.handleBlur = function (event) {
      return false;
    };

    this.handleResize = function () {};
  }

  Autodesk.Viewing.Extension.call(this, viewer, options);

  var _self = this;

  _self.tool = null;

  ///////////////////////////////////////////////////////
  // extension load callback
  //
  ///////////////////////////////////////////////////////
  _self.load = async function () {
    console.log("Autodesk.ADN.Viewing.Extension.CopyAxisTool loaded");

    // 確保載入 SceneBuilder 擴展
    try {
      const sceneBuilderExt = await viewer.loadExtension(
        "Autodesk.Viewing.SceneBuilder"
      );
      console.log("SceneBuilder extension loaded:", sceneBuilderExt);
      _self._sceneBuilder = sceneBuilderExt; // 初始化 _sceneBuilder
    } catch (err) {
      console.error("Error loading SceneBuilder extension:", err);
      return false; // 如果 SceneBuilder 加載失敗，則停止
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Z" || event.key === "z") {
        event.preventDefault();
        const selectedDbId = viewer.getSelection();
        if (selectedDbId.length > 0) {
          viewer.fitToView([selectedDbId]);
        }
      }
    });
    return true;
  };

  _self.onToolbarCreated = function () {
    // Create a new toolbar group if it doesn't exist
    this._group = this.viewer.toolbar.getControl("dashboard-toolbar-group");
    if (!this._group) {
      this._group = new Autodesk.Viewing.UI.ControlGroup(
        "dashboard-toolbar-group"
      );
      this.viewer.toolbar.addControl(this._group);
    }

    // Add a new button to the toolbar group
    this._button = new Autodesk.Viewing.UI.Button("copyAxisExtensionButton");
    this._button.icon.classList.add("fa-solid", "fa-copy");

    this._button.onClick = (ev) => {
      // Execute an action here
      if (this._button.getState() !== Autodesk.Viewing.UI.Button.State.ACTIVE) {
        _self.initialize();
        this._button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
      } else {
        viewer.toolController.deactivateTool(_self.tool.getName());
        this._button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
      }
    };
    this._button.setToolTip("Transform Object By Axis");
    this._group.addControl(this._button);
  };

  _self.initialize = function () {
    _self.tool = new CopyAxisTool();

    viewer.toolController.registerTool(_self.tool);

    if (this.viewer.model.getInstanceTree()) {
      _self.customize();
    } else {
      this.viewer.addEventListener(
        Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT,
        _self.customize()
      );
    }
  };

  _self.customize = function () {
    viewer.toolController.activateTool(_self.tool.getName());
  };

  ///////////////////////////////////////////////////////
  // extension unload callback
  //
  ///////////////////////////////////////////////////////
  _self.unload = function () {
    if (_self.tool) viewer.toolController.deactivateTool(_self.tool.getName());
    // Clean our UI elements if we added any
    if (this._group) {
      this._group.removeControl(this._button);
      if (this._group.getNumberOfControls() === 0) {
        this.viewer.toolbar.removeControl(this._group);
      }
    }
    console.log("Autodesk.ADN.Viewing.Extension.CopyAxisTool unloaded");

    return true;
  };

  ///////////////////////////////////////////////////////
  // new random guid
  //
  ///////////////////////////////////////////////////////
  function guid() {
    var d = new Date().getTime();

    var guid = "xxxx-xxxx-xxxx-xxxx-xxxx".replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == "x" ? r : (r & 0x7) | 0x8).toString(16);
    });

    return guid;
  }
};

Autodesk.ADN.Viewing.Extension.CopyAxisTool.prototype = Object.create(
  Autodesk.Viewing.Extension.prototype
);

Autodesk.ADN.Viewing.Extension.CopyAxisTool.prototype.constructor =
  Autodesk.ADN.Viewing.Extension.CopyAxisTool;

Autodesk.Viewing.theExtensionManager.registerExtension(
  "CopyAxisTool",
  Autodesk.ADN.Viewing.Extension.CopyAxisTool
);
