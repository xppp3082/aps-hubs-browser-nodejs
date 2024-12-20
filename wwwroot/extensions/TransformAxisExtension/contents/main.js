/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by APS Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////
// Transform Tool viewer extension
// by Philippe Leefsma, August 2015
//
///////////////////////////////////////////////////////////////////
AutodeskNamespace("Autodesk.ADN.Viewing.Extension");

Autodesk.ADN.Viewing.Extension.TransformAxisTool = function (viewer, options) {
  ///////////////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////////////
  function TransformAxisTool() {
    var _hitPoint = null;

    var _isDragging = false;

    var _transformMesh = null;

    var _modifiedFragIdMap = {};

    var _selectedFragProxyMap = {};

    var _transformControlTx = null;

    var _mouseDownTime = 0;
    var _clickThreshold = 200; // 設定點擊閾值為 200 毫秒
    var _clickAxis = null;
    var _timeOut = null;

    ///////////////////////////////////////////////////////////////////////////
    // Creates a dummy mesh to attach control to
    // 創造一個假 mesh 來附著 transformControlTx
    ///////////////////////////////////////////////////////////////////////////
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

    ///////////////////////////////////////////////////////////////////////////
    // on translation change
    // 當 transformControlTx 的 translation 改變時，更新 selectedFragProxyMap 的 position
    ///////////////////////////////////////////////////////////////////////////
    function onTxChange() {
      for (var fragId in _selectedFragProxyMap) {
        var fragProxy = _selectedFragProxyMap[fragId];

        var position = new THREE.Vector3(
          _transformMesh.position.x - fragProxy.offset.x,
          _transformMesh.position.y - fragProxy.offset.y,
          _transformMesh.position.z - fragProxy.offset.z
        );

        fragProxy.position = position;
        fragProxy.updateAnimTransform();
      }

      viewer.impl.sceneUpdated(true);
    }

    ///////////////////////////////////////////////////////////////////////////
    // on camera changed
    //
    ///////////////////////////////////////////////////////////////////////////
    function onCameraChanged() {
      _transformControlTx.update();
    }

    ///////////////////////////////////////////////////////////////////////////
    // item selected callback
    //
    ///////////////////////////////////////////////////////////////////////////
    let _selectedDbId = null;
    function onItemSelected(event) {
      _selectedFragProxyMap = {};
      // 取得當前選取物件的 dbId
      console.log("onItemSelected: ", event);
      const dbIds = event.dbIdArray;
      if (dbIds && dbIds.length > 0) {
        const dbId = dbIds[0];
        _selectedDbId = dbId;
        viewer.getProperties(dbId, (props) => {
          console.log("selected object properties: ", props);
        });
      }
      //component unselected
      if (!event.fragIdsArray.length) {
        _hitPoint = null;

        _transformControlTx.visible = false;

        _transformControlTx.removeEventListener("change", onTxChange);

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

          _modifiedFragIdMap[fragId] = {};
        });

        _hitPoint = null;
      } else {
        _transformControlTx.visible = false;
      }
    }

    ///////////////////////////////////////////////////////////////////////////
    // normalize screen coordinates
    //
    ///////////////////////////////////////////////////////////////////////////
    function normalize(screenPoint) {
      var viewport = viewer.navigation.getScreenViewport();

      var n = {
        x: (screenPoint.x - viewport.left) / viewport.width,
        y: (screenPoint.y - viewport.top) / viewport.height,
      };

      return n;
    }

    ///////////////////////////////////////////////////////////////////////////
    // get 3d hit point on mesh
    //
    ///////////////////////////////////////////////////////////////////////////
    function getHitPoint(event) {
      var screenPoint = {
        x: event.clientX,
        y: event.clientY,
      };

      var n = normalize(screenPoint);

      var hitPoint = viewer.utilities.getHitPoint(n.x, n.y);

      return hitPoint;
    }

    ///////////////////////////////////////////////////////////////////////////
    // handle arrow click to show input box
    //
    ///////////////////////////////////////////////////////////////////////////
    function onArrowClick(direction, screenPoint) {
      alert("onArrowClick: " + direction);
      const inputBox = document.createElement("input");
      inputBox.type = "number";
      inputBox.placeholder = `請輸入往 ${direction} 軸的移動距離 (cm)`;

      // 設置輸入框的位置為滑鼠點擊的位置
      inputBox.style.position = "absolute";
      inputBox.style.left = `${screenPoint.x}px`;
      inputBox.style.top = `${screenPoint.y}px`;
      inputBox.style.zIndex = 1000; // 設置較高的 z-index

      document.body.appendChild(inputBox);
      inputBox.focus();

      inputBox.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          const distance = parseFloat(inputBox.value);
          if (!isNaN(distance)) {
            moveElement(direction, distance);
          } else {
            console.error("Invalid input, please enter a number");
          }
          document.body.removeChild(inputBox);
          // _transformControlTx.enabled = true;
        }
      });
      // 全局監聽鍵盤事件
      const handleGlobalKeyDown = (event) => {
        if (event.key === "Escape") {
          console.log("Escape");
          if (_clickAxis !== null || totalDistanceMoved.length > 0) {
            moveElementWithVector(totalDistanceMoved);
            _clickAxis = null;
          }
          if (inputBox !== null) {
            document.body.removeChild(inputBox);
          }
          document.removeEventListener("keydown", handleGlobalKeyDown); // 移除全局事件監聽
          // _transformControlTx.enabled = true;
        }
      };

      document.addEventListener("keydown", handleGlobalKeyDown); // 添加全局事件監聽
    }

    ///////////////////////////////////////////////////////////////////////////
    // move element based on direction and distance
    //
    ///////////////////////////////////////////////////////////////////////////
    function moveElement(direction, distance) {
      const moveVector = new THREE.Vector3();
      const convertedDistance = convertUnitBasedOnModel(distance);
      console.log("moveElement: ", direction, distance);
      switch (direction) {
        case "X":
          moveVector.set(convertedDistance, 0, 0);
          break;
        case "Y":
          moveVector.set(0, convertedDistance, 0);
          break;
        case "Z":
          moveVector.set(0, 0, convertedDistance);
          break;
        default:
          console.error("Invalid direction");
          return;
      }
      _transformMesh.position.add(moveVector);
      onTxChange(); // 更新位置

      // 貼附移動過後的 transformControlTx to transformMesh
      _transformControlTx.attach(_transformMesh);
      updateHistory(moveVector);
    }

    function moveElementWithVector(moveVector) {
      _transformMesh.position.add(moveVector);
      onTxChange(); // 更新位置
      const convertedVector = convertVectorBasedOnModel(moveVector);
      updateHistory(convertedVector);
    }

    async function updateHistory(moveVector) {
      const modelUrn = viewer.model.getData().urn;
      const response = await fetch(
        `/api/modelActions/${modelUrn}/history?dbid=${_selectedDbId}`
      );
      const { data } = await response.json();
      if (data && data.length > 0) {
        const existingAction = data[0];
        const updatedAction = {
          ...existingAction,
          x: existingAction.x + moveVector.x,
          y: existingAction.y + moveVector.y,
          z: existingAction.z + moveVector.z,
          timestamp: new Date().toISOString(),
        };
        await fetch(`/api/modelActions/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedAction),
        });
        console.log(
          `Updated move action for dbId ${_selectedDbId}:`,
          updatedAction
        );
      } else {
        //如果不存在，則插入新的紀錄
        const modelUrn = viewer.model.getData().urn;
        fetch(`/api/modelActions/move`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            urn: modelUrn,
            dbid: _selectedDbId,
            x: moveVector.x,
            y: moveVector.y,
            z: moveVector.z,
          }),
        });
      }
    }

    function convertUnitBasedOnModel(distance) {
      const modelUnit = viewer.model.getUnitString();
      switch (modelUnit) {
        case "mm":
          return distance * 10;
        case "cm":
          return distance * 1;
        case "m":
          return distance / 100;
        case "km":
          return distance / 100000;
        case "ft":
          return distance / 30.48;
        case "in":
          return distance / 2.54;
        default:
          return distance;
      }
    }

    function convertVectorBasedOnModel(moveVector) {
      const modelUnit = viewer.model.getUnitString();
      const convertedVector = new THREE.Vector3(); // 用於存儲轉換後的向量

      switch (modelUnit) {
        case "mm":
          convertedVector.set(
            moveVector.x / 10,
            moveVector.y / 10,
            moveVector.z / 10
          ); // 將毫米轉換為公分
          break;
        case "cm":
          convertedVector.copy(moveVector); // 不需要轉換，已經是公分
          break;
        case "m":
          convertedVector.set(
            moveVector.x * 100,
            moveVector.y * 100,
            moveVector.z * 100
          ); // 將米轉換為公分
          break;
        case "km":
          convertedVector.set(
            moveVector.x * 100000,
            moveVector.y * 100000,
            moveVector.z * 100000
          ); // 將公里轉換為公分
          break;
        case "ft":
          convertedVector.set(
            moveVector.x * 30.48,
            moveVector.y * 30.48,
            moveVector.z * 30.48
          ); // 將英尺轉換為公分
          break;
        case "in":
          convertedVector.set(
            moveVector.x * 2.54,
            moveVector.y * 2.54,
            moveVector.z * 2.54
          ); // 將英寸轉換為公分
          break;
        default:
          convertedVector.copy(moveVector); // 如果單位未知，則不進行轉換
          break;
      }
      return convertedVector; // 返回轉換後的向量
    }
    ///////////////////////////////////////////////////////////////////////////
    // returns all transformed meshes
    //
    ///////////////////////////////////////////////////////////////////////////
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

    ///////////////////////////////////////////////////////////////////////////
    //
    //
    ///////////////////////////////////////////////////////////////////////////
    this.getNames = function () {
      return ["Dotty.Viewing.Tool.TransformAxisTool"];
    };

    this.getName = function () {
      return "Dotty.Viewing.Tool.TransformAxisTool";
    };

    ///////////////////////////////////////////////////////////////////////////
    // activates tool
    //
    ///////////////////////////////////////////////////////////////////////////
    this.activate = function () {
      viewer.select([]);
      console.log("TransformAxisTool activate");
      var bbox = viewer.model.getBoundingBox();

      viewer.impl.createOverlayScene("Dotty.Viewing.Tool.TransformAxisTool");

      _transformControlTx = new THREE.TransformControls(
        viewer.impl.camera,
        viewer.impl.canvas,
        "translate"
      );

      _transformControlTx.setSize(bbox.getBoundingSphere().radius * 5);

      _transformControlTx.visible = false;

      viewer.impl.addOverlay(
        "Dotty.Viewing.Tool.TransformAxisTool",
        _transformControlTx
      );

      _transformMesh = createTransformMesh();

      _transformControlTx.attach(_transformMesh);

      _transformControlTx.addEventListener("mouseDown", (event) => {
        console.log("TransformAxisTool mouseDown: ", event);
        if (event.button == 1 || event.buttons == 4) {
          const axis = _transformControlTx.axis;
          console.log("TransformAxisTool mouseDown with axis: ", axis);
        }
      });

      viewer.addEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        onItemSelected
      );
    };

    ///////////////////////////////////////////////////////////////////////////
    // deactivate tool
    //
    ///////////////////////////////////////////////////////////////////////////
    this.deactivate = function () {
      viewer.impl.removeOverlay(
        "Dotty.Viewing.Tool.TransformAxisTool",
        _transformControlTx
      );

      _transformControlTx.removeEventListener("change", onTxChange);

      _transformControlTx = null;

      viewer.impl.removeOverlayScene("Dotty.Viewing.Tool.TransformAxisTool");

      viewer.removeEventListener(
        Autodesk.Viewing.CAMERA_CHANGE_EVENT,
        onCameraChanged
      );

      viewer.removeEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        onItemSelected
      );
    };

    ///////////////////////////////////////////////////////////////////////////
    //
    //
    ///////////////////////////////////////////////////////////////////////////
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
      return false;
    };

    this.handleKeyUp = function (event, keyCode) {
      return false;
    };

    this.handleWheelInput = function (delta) {
      return false;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Original version of handleButtonDown
    //
    ///////////////////////////////////////////////////////////////////////////
    // this.handleButtonDown = function (event, button) {
    //   console.log("TransformAxisTool handleButtonDown:", this);
    //   _hitPoint = getHitPoint(event);

    //   _isDragging = true;

    //   if (_transformControlTx.onPointerDown(event)) return true;

    //   //return _transRotControl.onPointerDown(event);
    //   return false;
    // };

    ///////////////////////////////////////////////////////////////////////////
    // handle button down to detect arrow clicks
    //
    ///////////////////////////////////////////////////////////////////////////
    this.handleButtonDown = function (event, button) {
      if (_transformControlTx.axis === null) {
        _hitPoint = getHitPoint(event);
      }
      _isDragging = false;
      if (_transformControlTx.onPointerDown(event)) {
        console.log("onPointerDown: ", event);
        const axis = _transformControlTx.axis;
        _clickAxis = axis;
        if (axis) {
          onArrowClick(axis, { x: event.clientX, y: event.clientY });
          _clickAxis = null;
        }
        return true;
      }
      return false;
    };

    // ///////////////////////////////////////////////////////////////////////////
    // // original version of handleButtonUp
    // //
    // ///////////////////////////////////////////////////////////////////////////
    this.handleButtonUp = function (event, button) {
      _isDragging = false;
      console.log("clickAxis: ", _clickAxis);
      if (_clickAxis !== null) {
        moveElementWithVector(totalDistanceMoved);
        _clickAxis = null;
      }
      if (_transformControlTx.onPointerUp(event)) {
        console.log("onPointerUp: ", event);
        return true;
      }
      //return _transRotControl.onPointerUp(event);
      return false;
    };

    // // this.handleButtonUp = function (event, button) {
    // //   // // const mouseUpTime = Date.now();
    // //   // // const pressDuration = mouseUpTime - _mouseDownTime;
    // //   // console.log("Button up event happened, pressDuration:", pressDuration);
    // //   // if (_transformControlTx.onPointerUp(event)) {
    // //   //   const axis = _transformControlTx.axis;

    // //   //   if (_clickAxis && pressDuration < _clickThreshold) {
    // //   //     // 短按 - 顯示輸入框
    // //   //     console.log("Quick click detected on axis:", axis);
    // //   //     onArrowClick(axis, { x: event.clientX, y: event.clientY });
    // //   //   }
    // //   //   // else if (axis && pressDuration >= _clickThreshold) {
    // //   //   //   // 長按 - 拖曳結束
    // //   //   //   console.log("Drag ended on axis:", axis);
    // //   //   //   _isDragging = false;
    // //   //   // }
    // //   //   return true;
    // //   // }
    // //   clearTimeout(_timeOut);
    // //   if (!_isDragging && !_clickAxis)
    // //     onArrowClick(_clickAxis, { x: event.clientX, y: event.clientY });
    // //   if (_transformControlTx.onPointerUp(event)) return true;
    // //   // _isDragging = false;
    // //   return false;
    // // };
    ///////////////////////////////////////////////////////////////////////////
    //
    //
    ///////////////////////////////////////////////////////////////////////////
    let totalDistanceMoved = new THREE.Vector3(); //用於紀錄移動距離

    this.handleMouseMove = function (event) {
      if (_isDragging) {
        const prevoiusHitPoint = _transformControlTx.position.clone();

        if (_transformControlTx.onPointerMove(event)) {
          const currentHitPoint = _transformControlTx.position; // 獲取當前位置
          const distanceMoved = currentHitPoint.clone().sub(prevoiusHitPoint); // 計算移動距離
          totalDistanceMoved.add(distanceMoved); // 累加移動距離

          console.log("TransformAxisTool onPointerMove: ", event);
          return true;
        }

        return false;
      }

      if (_transformControlTx.onPointerHover(event)) return true;

      //return _transRotControl.onPointerHover(event);
      return false;
    };

    ///////////////////////////////////////////////////////////////////////////
    //
    //
    ///////////////////////////////////////////////////////////////////////////
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
  _self.load = function () {
    console.log("Autodesk.ADN.Viewing.Extension.TransformAxisTool loaded");

    document.addEventListener("keydown", (event) => {
      console.log("TransformAxisTool keydown: ", event);
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
    this._button = new Autodesk.Viewing.UI.Button(
      "transformAxisExtensionButton"
    );
    this._button.icon.classList.add("fa-solid", "fa-pen-ruler");

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
    _self.tool = new TransformAxisTool();

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
    console.log("Autodesk.ADN.Viewing.Extension.TransformAxisTool unloaded");

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

Autodesk.ADN.Viewing.Extension.TransformAxisTool.prototype = Object.create(
  Autodesk.Viewing.Extension.prototype
);

Autodesk.ADN.Viewing.Extension.TransformAxisTool.prototype.constructor =
  Autodesk.ADN.Viewing.Extension.TransformAxisTool;

Autodesk.Viewing.theExtensionManager.registerExtension(
  "TransformAxisTool",
  Autodesk.ADN.Viewing.Extension.TransformAxisTool
);
