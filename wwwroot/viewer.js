import "./extensions/MoveExtension.js";
import "./extensions/DeleteExtension.js";
import "./extensions/HistoryExtension.js";
import "./extensions/TransformExtension.js";

async function getAccessToken(callback) {
  try {
    const resp = await fetch("/api/auth/token");
    if (!resp.ok) throw new Error(await resp.text());
    const { access_token, expires_in } = await resp.json();
    callback(access_token, expires_in);
  } catch (err) {
    alert("Could not obtain access token. See the console for more details.");
    console.error(err);
  }
}

export function initViewer(container) {
  return new Promise(function (resolve, reject) {
    Autodesk.Viewing.Initializer(
      { env: "AutodeskProduction", getAccessToken },
      function () {
        const config = {
          extensions: [
            "Autodesk.DocumentBrowser",
            "MoveExtension",
            "DeleteExtension",
            "HistoryExtension",
          ],
        };
        const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
        viewer.start();
        viewer.setTheme("light-theme");
        resolve(viewer);
      }
    );
  });
}

export function loadModel(viewer, urn) {
  function onDocumentLoadSuccess(doc) {
    viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry());
    // var viewables = doc.getRoot().getDefaultGeometry();
    // viewer.loadDocumentNode(doc, viewables).then((i) => {
    //   // documented loaded, any action?
    //   var ViewerInstance = new CustomEvent("viewerinstance", {
    //     detail: { viewer: viewer },
    //   });
    //   document.dispatchEvent(ViewerInstance);
    //   var LoadExtensionEvent = new CustomEvent("loadextension", {
    //     detail: {
    //       extension: "TransformationExtension2",
    //       viewer: viewer,
    //     },
    //   });
    //   document.dispatchEvent(LoadExtensionEvent);
    // });
  }

  function onDocumentLoadFailure(code, message) {
    alert("Could not load model. See console for more details.");
    console.error(message);
  }
  Autodesk.Viewing.Document.load(
    "urn:" + urn,
    onDocumentLoadSuccess,
    onDocumentLoadFailure
  );
}
