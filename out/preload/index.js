"use strict";
const electron = require("electron");
const electronAPI = {
  ipcRenderer: {
    send(channel, ...args) {
      electron.ipcRenderer.send(channel, ...args);
    },
    sendTo(webContentsId, channel, ...args) {
      const electronVer = process.versions.electron;
      const electronMajorVer = electronVer ? parseInt(electronVer.split(".")[0]) : 0;
      if (electronMajorVer >= 28) {
        throw new Error('"sendTo" method has been removed since Electron 28.');
      } else {
        electron.ipcRenderer.sendTo(webContentsId, channel, ...args);
      }
    },
    sendSync(channel, ...args) {
      return electron.ipcRenderer.sendSync(channel, ...args);
    },
    sendToHost(channel, ...args) {
      electron.ipcRenderer.sendToHost(channel, ...args);
    },
    postMessage(channel, message, transfer) {
      electron.ipcRenderer.postMessage(channel, message, transfer);
    },
    invoke(channel, ...args) {
      return electron.ipcRenderer.invoke(channel, ...args);
    },
    on(channel, listener) {
      electron.ipcRenderer.on(channel, listener);
      return () => {
        electron.ipcRenderer.removeListener(channel, listener);
      };
    },
    once(channel, listener) {
      electron.ipcRenderer.once(channel, listener);
      return () => {
        electron.ipcRenderer.removeListener(channel, listener);
      };
    },
    removeListener(channel, listener) {
      electron.ipcRenderer.removeListener(channel, listener);
      return this;
    },
    removeAllListeners(channel) {
      electron.ipcRenderer.removeAllListeners(channel);
    }
  },
  webFrame: {
    insertCSS(css) {
      return electron.webFrame.insertCSS(css);
    },
    setZoomFactor(factor) {
      if (typeof factor === "number" && factor > 0) {
        electron.webFrame.setZoomFactor(factor);
      }
    },
    setZoomLevel(level) {
      if (typeof level === "number") {
        electron.webFrame.setZoomLevel(level);
      }
    }
  },
  webUtils: {
    getPathForFile(file) {
      return electron.webUtils.getPathForFile(file);
    }
  },
  process: {
    get platform() {
      return process.platform;
    },
    get versions() {
      return process.versions;
    },
    get env() {
      return { ...process.env };
    }
  }
};
const api = {
  // 文件操作
  fileNew: () => electron.ipcRenderer.invoke("invoke:file-new"),
  fileOpen: () => electron.ipcRenderer.invoke("invoke:file-open"),
  fileOpenPath: (filePath) => electron.ipcRenderer.invoke("invoke:file-open-path", filePath),
  fileSave: (filePath, content) => electron.ipcRenderer.invoke("invoke:file-save", filePath, content),
  fileSaveAs: (content, defaultName) => electron.ipcRenderer.invoke("invoke:file-save-as", content, defaultName),
  folderListMd: (dirPath) => electron.ipcRenderer.invoke("invoke:folder-list-md", dirPath),
  // 配置操作
  configGet: () => electron.ipcRenderer.invoke("invoke:config-get"),
  configSet: (config) => electron.ipcRenderer.invoke("invoke:config-set", config),
  // 图片本地化
  imageLocalize: (imageData, docPath, ext) => electron.ipcRenderer.invoke("invoke:image-localize", imageData, docPath, ext),
  // 导出
  exportHtml: (html, defaultName) => electron.ipcRenderer.invoke("invoke:export-html", html, defaultName),
  exportPdf: (html, defaultName) => electron.ipcRenderer.invoke("invoke:export-pdf", html, defaultName),
  exportMd: (markdown, defaultName) => electron.ipcRenderer.invoke("invoke:export-md", markdown, defaultName),
  // 窗口
  windowShowItemInFolder: (filePath) => electron.ipcRenderer.invoke("invoke:window-show-item-in-folder", filePath),
  windowGetNativeTheme: () => electron.ipcRenderer.invoke("invoke:window-get-native-theme"),
  windowSetDirty: (count) => electron.ipcRenderer.invoke("invoke:window-set-dirty", count),
  windowClose: () => electron.ipcRenderer.invoke("invoke:window-close"),
  // 主进程 -> 渲染进程事件监听
  onFileOpened: (callback) => {
    const listener = (_event, p) => callback(p);
    electron.ipcRenderer.on("on:file-opened", listener);
    return () => electron.ipcRenderer.removeListener("on:file-opened", listener);
  },
  onMenuAction: (callback) => {
    const listener = (_event, a, p) => callback(a, p);
    electron.ipcRenderer.on("on:menu-action", listener);
    return () => electron.ipcRenderer.removeListener("on:menu-action", listener);
  },
  onCloseRequested: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on("on:close-requested", listener);
    return () => electron.ipcRenderer.removeListener("on:close-requested", listener);
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electronAPI = electronAPI;
  window.api = api;
}
