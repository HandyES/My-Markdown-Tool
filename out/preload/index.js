"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  // 文件操作
  fileNew: () => electron.ipcRenderer.invoke("invoke:file-new"),
  fileOpen: () => electron.ipcRenderer.invoke("invoke:file-open"),
  fileOpenPath: (filePath) => electron.ipcRenderer.invoke("invoke:file-open-path", filePath),
  fileSave: (filePath, content) => electron.ipcRenderer.invoke("invoke:file-save", filePath, content),
  fileSaveAs: (content, defaultName) => electron.ipcRenderer.invoke("invoke:file-save-as", content, defaultName),
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
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electronAPI", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electronAPI = preload.electronAPI;
  window.api = api;
}
