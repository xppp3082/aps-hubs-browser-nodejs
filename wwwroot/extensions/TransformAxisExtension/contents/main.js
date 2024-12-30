import { viewerUtils } from "../../../utils/viewerUtils.js";
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
  // Redesgin By Travis
  // 1. 當選取物件時 => getHitpoint => getSelectedObject => 在 hitpoint 上創建 transformMesh
  // Switch
  // Case(要移動此物件)
  // 2. 當按下 TransformControls 時 => 取的要移動的軸，並在軸上顯示 inputBox (這邊要避免 onItemSelected 被 fired )
  // 3. 當輸入框輸入數字並按下 Enter 時 => 移動物件 => 同時刪除 inputBox

  // Case(不移動此物件)
  // 4. 當按下 ESC 時 => 不移動物件 => 同時刪除 inputBox
  // 5. 當沒按下 ESC 但直接選擇另一個物件時，移動 transformControl 到 hitpoint，並刪除既有的 inputBox

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
    var _clickAxis = null;
    var _selectedDbId = null;
    var _isActivated = true;
    var _selectedElementId = null;
    ///////////////////////////////////////////////////////////////////////////
    // Creates a dummy mesh to attach control to
    // 創造一個假 mesh 來附著 transformControlTx
    ///////////////////////////////////////////////////////////////////////////
    function createTransformMesh() {
      var material = new THREE.MeshPhongMaterial({ color: 0xff0000 });

      // 透過 Autodesk.Viewing.MaterialsManager 來創建 material
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
    async function onItemSelected(event) {
      if (!_isActivated) return;
      console.log(_clickAxis);
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
        console.log("current selected dbId: ", _selectedDbId);
        _selectedElementId = await viewerUtils.getElementId(viewer, dbId);
      }
      //component unselected
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
      // alert("onArrowClick: " + direction);
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

    ///////////////////////////////////////////////////////////////////////////
    // move element based on direction and distance
    //
    ///////////////////////////////////////////////////////////////////////////
    function moveElement(direction, distance) {
      const moveVector = new THREE.Vector3();
      const convertedDistance = viewerUtils.convertUnitBasedOnModel(
        viewer,
        distance
      );
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
          alert("Invalid direction, please click on the right axis.");
          console.error("Invalid direction");
          return;
      }
      _transformMesh.position.add(moveVector);
      onTxChange(); // 更新位置

      // 貼附移動過後的 transformControlTx to transformMesh
      _transformControlTx.attach(_transformMesh);
      updateHistory(moveVector);
    }

    async function updateHistory(moveVector) {
      const modelUrn = viewer.model.getData().urn;
      const response = await fetch(
        `/api/modelActions/${modelUrn}/history?dbid=${_selectedDbId}`
      );
      const { data } = await response.json();
      if (data && data.length > 0) {
        const existingAction = data[0];
        console.log("existingAction: ", existingAction);
        const updatedAction = {
          ...existingAction,
          x: existingAction.x + moveVector.x,
          y: existingAction.y + moveVector.y,
          z: existingAction.z + moveVector.z,
          elementId: existingAction.elementId || _selectedElementId,
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
            elementId: _selectedElementId,
          }),
        });
      }
    }

    // function convertUnitBasedOnModel(distance) {
    //   const modelUnit = viewer.model.getUnitString();
    //   switch (modelUnit) {
    //     case "mm":
    //       return distance * 10;
    //     case "cm":
    //       return distance * 1;
    //     case "m":
    //       return distance / 100;
    //     case "km":
    //       return distance / 100000;
    //     case "ft":
    //       return distance / 30.48;
    //     case "in":
    //       return distance / 2.54;
    //     default:
    //       return distance;
    //   }
    // }

    // // 因為 Viewer.getProperties 是異步的，所以需要使用 Promise 來處理非同步的問題
    // function getElementId(viewer, dbId) {
    //   return new Promise((resolve, reject) => {
    //     viewer.getProperties(dbId, (props) => {
    //       console.log("selected object properties: ", props);
    //       const elementIdProperty = props.properties.find(
    //         (prop) => prop.attributeName === "ElementId"
    //       );
    //       if (elementIdProperty) {
    //         resolve(elementIdProperty.displayValue);
    //       } else {
    //         reject(new Error("ElementId not found"));
    //       }
    //     });
    //   });
    // }

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

      // 監聽模型中選擇變更的事件
      // 以下都會觸發選擇變更事件
      // viewer.select(dbId);  // 選擇特定元素
      // viewer.select([dbId1, dbId2]);  // 選擇多個元素
      // viewer.clearSelection();  // 清除所有選擇
      // viewer.toggleSelect(dbId);  // 切換元素的選擇狀態
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

      viewer.impl.removeOverlayScene("Dotty.Viewing.Tool.TransformAxisTool");

      viewer.removeEventListener(
        Autodesk.Viewing.CAMERA_CHANGE_EVENT,
        onCameraChanged
      );
      console.log("TransformAxisTool deactivate");

      viewer.removeEventListener(
        Autodesk.Viewing.SELECTION_CHANGED_EVENT,
        onItemSelected
      );
      // _transformControlTx = null;
      _isActivated = false;
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

    ///////////////////////////////////////////////////////////////////////////
    // handle button down to detect arrow clicks
    //
    ///////////////////////////////////////////////////////////////////////////
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

    // ///////////////////////////////////////////////////////////////////////////
    // // original version of handleButtonUp
    // //
    // ///////////////////////////////////////////////////////////////////////////
    this.handleButtonUp = function (event, button) {
      _isDragging = false;
      if (_transformControlTx.onPointerUp(event)) {
        console.log("onPointerUp: ", event);
        return true;
      }
      //return _transRotControl.onPointerUp(event);
      return false;
    };

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
    this._button.icon.classList.add("fas", "fa-arrows-alt");

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
