"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const log = require("electron-log");
const fs = require("fs");
const util = require("util");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
log.transports.file.level = "info";
log.transports.file.resolvePathFn = () => {
  return path.join(electron.app.getPath("userData"), "logs", "main.log");
};
log.transports.console.level = "debug";
function sendToMain(channel, ...args) {
  const win = electron.BrowserWindow.getFocusedWindow() || electron.BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send(channel, ...args);
  }
}
function buildMenu() {
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "新建",
          accelerator: "Ctrl+N",
          click: () => sendToMain("on:menu-action", "file:new")
        },
        {
          label: "打开",
          accelerator: "Ctrl+O",
          click: () => sendToMain("on:menu-action", "file:open")
        },
        {
          label: "保存",
          accelerator: "Ctrl+S",
          click: () => sendToMain("on:menu-action", "file:save")
        },
        {
          label: "另存为",
          accelerator: "Ctrl+Shift+S",
          click: () => sendToMain("on:menu-action", "file:saveAs")
        },
        { type: "separator" },
        {
          label: "导出",
          submenu: [
            {
              label: "HTML",
              accelerator: "Ctrl+Shift+E",
              click: () => sendToMain("on:menu-action", "export:html")
            },
            {
              label: "PDF",
              accelerator: "Ctrl+Shift+P",
              click: () => sendToMain("on:menu-action", "export:pdf")
            },
            {
              label: "Markdown",
              click: () => sendToMain("on:menu-action", "export:md")
            }
          ]
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: "Ctrl+Q",
          click: () => {
            log.info("Quit from menu");
            electron.app.quit();
          }
        }
      ]
    },
    {
      label: "编辑",
      submenu: [
        { label: "撤销", accelerator: "Ctrl+Z", role: "undo" },
        { label: "重做", accelerator: "Ctrl+Y", role: "redo" },
        { type: "separator" },
        {
          label: "查找",
          accelerator: "Ctrl+F",
          click: () => sendToMain("on:menu-action", "edit:find")
        },
        {
          label: "替换",
          accelerator: "Ctrl+H",
          click: () => sendToMain("on:menu-action", "edit:replace")
        }
      ]
    },
    {
      label: "视图",
      submenu: [
        {
          label: "编辑模式",
          submenu: [
            {
              label: "即时渲染 (ir)",
              click: () => sendToMain("on:menu-action", "mode:ir")
            },
            {
              label: "分屏预览 (sv)",
              click: () => sendToMain("on:menu-action", "mode:sv")
            },
            {
              label: "所见即所得 (wysiwyg)",
              click: () => sendToMain("on:menu-action", "mode:wysiwyg")
            }
          ]
        },
        { type: "separator" },
        {
          label: "主题",
          submenu: [
            {
              label: "亮色",
              click: () => sendToMain("on:menu-action", "theme:light")
            },
            {
              label: "暗色",
              click: () => sendToMain("on:menu-action", "theme:dark")
            },
            {
              label: "跟随系统",
              click: () => sendToMain("on:menu-action", "theme:auto")
            }
          ]
        },
        { type: "separator" },
        {
          label: "大纲面板",
          accelerator: "Ctrl+Shift+O",
          click: () => sendToMain("on:menu-action", "view:outline")
        },
        { type: "separator" },
        { label: "放大", accelerator: "Ctrl+=", role: "zoomIn" },
        { label: "缩小", accelerator: "Ctrl+-", role: "zoomOut" },
        { label: "重置缩放", accelerator: "Ctrl+0", role: "resetZoom" },
        { type: "separator" },
        { label: "全屏", accelerator: "F11", role: "togglefullscreen" }
      ]
    },
    {
      label: "插入",
      submenu: [
        {
          label: "粗体",
          accelerator: "Ctrl+B",
          click: () => sendToMain("on:menu-action", "insert:bold")
        },
        {
          label: "斜体",
          accelerator: "Ctrl+I",
          click: () => sendToMain("on:menu-action", "insert:italic")
        },
        {
          label: "链接",
          accelerator: "Ctrl+K",
          click: () => sendToMain("on:menu-action", "insert:link")
        },
        {
          label: "图片",
          accelerator: "Ctrl+Shift+I",
          click: () => sendToMain("on:menu-action", "insert:image")
        },
        {
          label: "代码块",
          accelerator: "Ctrl+Shift+K",
          click: () => sendToMain("on:menu-action", "insert:code")
        },
        {
          label: "表格",
          accelerator: "Ctrl+T",
          click: () => sendToMain("on:menu-action", "insert:table")
        },
        {
          label: "公式",
          accelerator: "Ctrl+Shift+M",
          click: () => sendToMain("on:menu-action", "insert:formula")
        }
      ]
    },
    {
      label: "设置",
      submenu: [
        {
          label: "偏好设置",
          accelerator: "Ctrl+,",
          click: () => sendToMain("on:menu-action", "settings:open")
        }
      ]
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "快捷键参考",
          click: () => {
            electron.dialog.showMessageBox({
              type: "info",
              title: "快捷键参考",
              message: "My Markdown 快捷键",
              detail: [
                "文件：新建 Ctrl+N / 打开 Ctrl+O / 保存 Ctrl+S / 另存为 Ctrl+Shift+S",
                "关闭标签 Ctrl+W / 退出 Ctrl+Q",
                "编辑：撤销 Ctrl+Z / 重做 Ctrl+Y / 查找 Ctrl+F / 替换 Ctrl+H",
                "模式切换 Ctrl+/",
                "主题 Ctrl+Alt+T / 大纲 Ctrl+Shift+O",
                "全屏 F11 / 放大 Ctrl+= / 缩小 Ctrl+- / 重置 Ctrl+0",
                "插入：粗体 Ctrl+B / 斜体 Ctrl+I / 链接 Ctrl+K / 图片 Ctrl+Shift+I",
                "插入：代码块 Ctrl+Shift+K / 表格 Ctrl+T / 公式 Ctrl+Shift+M",
                "导出：HTML Ctrl+Shift+E / PDF Ctrl+Shift+P"
              ].join("\n\n")
            });
          }
        },
        {
          label: "关于",
          click: () => {
            electron.dialog.showMessageBox({
              type: "info",
              title: "关于 My Markdown",
              message: "My Markdown",
              detail: `版本：${electron.app.getVersion()}
Electron：${process.versions.electron}
Node.js：${process.version}
Vditor：3.x

类似 Typora 的 Markdown 编辑器`
            });
          }
        },
        { type: "separator" },
        {
          label: "查看许可证",
          click: () => electron.shell.openExternal("https://opensource.org/licenses/MIT")
        }
      ]
    }
  ];
  const menu = electron.Menu.buildFromTemplate(template);
  electron.Menu.setApplicationMenu(menu);
  log.debug("Menu built");
}
function setupSingleInstance(onFileFromSecondInstance) {
  const lock = electron.app.requestSingleInstanceLock();
  if (!lock) {
    log.warn("Single instance lock not acquired, quitting second instance");
    electron.app.quit();
    return;
  }
  electron.app.on("second-instance", (_event, commandLine) => {
    log.info("Second instance detected, args:", commandLine);
    const fileArg = commandLine.slice().reverse().find((a) => {
      if (!a || a.startsWith("-")) return false;
      const low = a.toLowerCase();
      return low.endsWith(".md") || low.endsWith(".markdown");
    });
    if (fileArg) {
      onFileFromSecondInstance(fileArg);
    }
    const win = electron.BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}
const fsWriteFile = util.promisify(fs__namespace.writeFile);
const fsReadFile = util.promisify(fs__namespace.readFile);
const fsMkdir = util.promisify(fs__namespace.mkdir);
const fsExists = util.promisify(fs__namespace.exists);
const fsRename = util.promisify(fs__namespace.rename);
const fsStat = util.promisify(fs__namespace.stat);
async function readFile(filePath) {
  const buffer = await fsReadFile(filePath);
  return buffer.toString("utf8");
}
async function writeFile(filePath, content) {
  const dir = path__namespace.dirname(filePath);
  if (!await fsExists(dir)) {
    await fsMkdir(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  try {
    await fsWriteFile(tmpPath, content);
    await fsRename(tmpPath, filePath);
    log.debug(`File written atomically: ${filePath}`);
  } catch (e) {
    log.error(`Write file failed: ${filePath}`, e);
    try {
      if (await fsExists(tmpPath)) await fs__namespace.promises.unlink(tmpPath);
    } catch {
    }
    throw e;
  }
}
async function fileExists(filePath) {
  try {
    const stat = await fsStat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
async function mkdirp(dirPath) {
  await fsMkdir(dirPath, { recursive: true });
}
function registerFileIpcHandlers() {
  electron.ipcMain.handle("invoke:file-new", async () => {
    log.info("file-new invoked");
    return null;
  });
  electron.ipcMain.handle(
    "invoke:file-open-path",
    async (_event, filePath) => {
      try {
        if (!await fileExists(filePath)) {
          log.warn("file not found:", filePath);
          return null;
        }
        const content = await readFile(filePath);
        log.info("file opened:", filePath);
        return { path: filePath, content };
      } catch (e) {
        log.error("file-open-path failed", e);
        return null;
      }
    }
  );
  electron.ipcMain.handle(
    "invoke:file-save",
    async (_event, filePath, content) => {
      if (!filePath) return null;
      try {
        await writeFile(filePath, content);
        log.info("file saved:", filePath);
        return filePath;
      } catch (e) {
        log.error("file-save failed", e);
        return null;
      }
    }
  );
}
function getMainWindow$1() {
  return electron.BrowserWindow.getFocusedWindow() || electron.BrowserWindow.getAllWindows()[0] || void 0;
}
const OPEN_DIALOG_OPTS = {
  title: "打开 Markdown 文件",
  filters: [
    { name: "Markdown", extensions: ["md", "markdown", "txt"] },
    { name: "所有文件", extensions: ["*"] }
  ],
  properties: ["openFile", "showHiddenFiles"]
};
function registerDialogIpcHandlers() {
  electron.ipcMain.handle(
    "invoke:file-open",
    async () => {
      const win = getMainWindow$1();
      const result = win ? await electron.dialog.showOpenDialog(win, OPEN_DIALOG_OPTS) : await electron.dialog.showOpenDialog(OPEN_DIALOG_OPTS);
      if (result.canceled || result.filePaths.length === 0) return null;
      const filePath = result.filePaths[0];
      try {
        const content = await readFile(filePath);
        log.info("file opened via dialog:", filePath);
        return { path: filePath, content };
      } catch (e) {
        log.error("open file dialog read failed", e);
        electron.dialog.showErrorBox("打开文件失败", String(e));
        return null;
      }
    }
  );
  electron.ipcMain.handle(
    "invoke:file-save-as",
    async (_event, content, defaultName = "Untitled.md") => {
      const win = getMainWindow$1();
      const saveOpts = {
        title: "另存为",
        defaultPath: defaultName,
        filters: [
          { name: "Markdown", extensions: ["md", "markdown"] },
          { name: "所有文件", extensions: ["*"] }
        ]
      };
      const result = win ? await electron.dialog.showSaveDialog(win, saveOpts) : await electron.dialog.showSaveDialog(saveOpts);
      if (result.canceled || !result.filePath) return null;
      try {
        await writeFile(result.filePath, content);
        log.info("file-save-as saved:", result.filePath);
        return result.filePath;
      } catch (e) {
        log.error("save as failed", e);
        electron.dialog.showErrorBox("保存文件失败", String(e));
        return null;
      }
    }
  );
}
const DEFAULT_CONFIG = {
  editor: {
    defaultMode: "ir",
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
    codeTheme: "github",
    tabSize: 4,
    showLineNumber: true
  },
  save: {
    autoSave: true,
    autoSaveInterval: 3,
    saveOnBlur: true
  },
  image: {
    localize: true,
    directory: "assets",
    namingPattern: "image-YYYYMMDD-HHmmss"
  },
  appearance: {
    theme: "auto",
    windowSize: { width: 1200, height: 800 }
  },
  session: {
    restoreOnStartup: true,
    lastOpenFiles: []
  }
};
const CONFIG_FILENAME = "config.json";
function deepMerge(target, source) {
  const output = { ...target };
  const src = { ...source };
  for (const key of Object.keys(src)) {
    const sourceVal = src[key];
    const targetVal = output[key];
    if (sourceVal !== null && typeof sourceVal === "object" && !Array.isArray(sourceVal) && targetVal !== null && typeof targetVal === "object" && !Array.isArray(targetVal)) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else {
      output[key] = sourceVal;
    }
  }
  return output;
}
function getConfigPath() {
  return path.join(electron.app.getPath("userData"), CONFIG_FILENAME);
}
async function readConfig() {
  const configPath = getConfigPath();
  const exists = await fileExists(configPath);
  if (!exists) {
    log.info("Config not found, using DEFAULT_CONFIG");
    return deepMerge({}, DEFAULT_CONFIG);
  }
  try {
    const raw = await readFile(configPath);
    const parsed = JSON.parse(raw);
    const merged = deepMerge(DEFAULT_CONFIG, parsed);
    log.debug("Config loaded and merged");
    return merged;
  } catch (e) {
    log.error("Config parse failed, fallback to DEFAULT_CONFIG", e);
    return deepMerge({}, DEFAULT_CONFIG);
  }
}
async function writeConfig(config) {
  const configPath = getConfigPath();
  const content = JSON.stringify(config, null, 2);
  await writeFile(configPath, content);
  log.debug("Config written");
}
function registerConfigIpcHandlers() {
  electron.ipcMain.handle("invoke:config-get", async () => {
    return readConfig();
  });
  electron.ipcMain.handle(
    "invoke:config-set",
    async (_event, config) => {
      try {
        await writeConfig(config);
      } catch (e) {
        log.error("config-set failed", e);
        throw e;
      }
    }
  );
}
function formatName(pattern, now) {
  const pad = (n) => String(n).padStart(2, "0");
  const YYYY = String(now.getFullYear());
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return pattern.replace("YYYY", YYYY).replace("MM", MM).replace("DD", DD).replace("HH", HH).replace("mm", mm).replace("ss", ss);
}
function resolveUnique(dir, base, ext) {
  let candidate = path__namespace.join(dir, `${base}.${ext}`);
  let i = 1;
  while (fs__namespace.existsSync(candidate)) {
    candidate = path__namespace.join(dir, `${base}-${i}.${ext}`);
    i += 1;
  }
  return candidate;
}
function registerImageIpcHandlers() {
  electron.ipcMain.handle(
    "invoke:image-localize",
    async (_event, imageData, docPath, ext = "png") => {
      const cfg = await readConfig();
      const dir = path__namespace.join(path__namespace.dirname(docPath), cfg.image.directory || "assets");
      await mkdirp(dir);
      const pattern = cfg.image.namingPattern || "image-YYYYMMDD-HHmmss";
      const base = formatName(pattern, /* @__PURE__ */ new Date());
      const finalPath = resolveUnique(dir, base, ext);
      await fs__namespace.promises.writeFile(finalPath, Buffer.from(imageData));
      log.info("image localized:", finalPath);
      const relative = path__namespace.relative(path__namespace.dirname(docPath), finalPath);
      return relative.replace(/\\/g, "/");
    }
  );
}
function getMainWindow() {
  return electron.BrowserWindow.getFocusedWindow() || electron.BrowserWindow.getAllWindows()[0] || void 0;
}
async function saveAsDialog(defaultName, extensions, description) {
  const win = getMainWindow();
  const opts = {
    title: `导出 ${description}`,
    defaultPath: defaultName,
    filters: [{ name: description, extensions }]
  };
  const result = win ? await electron.dialog.showSaveDialog(win, opts) : await electron.dialog.showSaveDialog(opts);
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
}
function registerExportIpcHandlers() {
  electron.ipcMain.handle(
    "invoke:export-html",
    async (_event, html, defaultName) => {
      const outPath = await saveAsDialog(defaultName, ["html"], "HTML");
      if (!outPath) return null;
      const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8"><title>${path__namespace.basename(outPath, ".html")}</title>
<style>
body { font-family: system-ui, "Segoe UI", "Microsoft YaHei", sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; line-height: 1.7; }
code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; }
pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; margin-left: 0; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #dfe2e5; padding: 8px 12px; }
th { background: #f6f8fa; }
img { max-width: 100%; }
</style>
</head><body>${html}</body></html>`;
      try {
        await writeFile(outPath, fullHtml);
        log.info("html exported:", outPath);
        return outPath;
      } catch (e) {
        log.error("export-html failed", e);
        return null;
      }
    }
  );
  electron.ipcMain.handle(
    "invoke:export-pdf",
    async (_event, html, defaultName) => {
      const outPath = await saveAsDialog(defaultName, ["pdf"], "PDF");
      if (!outPath) return null;
      let pdfWindow = null;
      try {
        pdfWindow = new electron.BrowserWindow({
          show: false,
          width: 1200,
          height: 1600,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        });
        const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8"><title>${path__namespace.basename(outPath, ".pdf")}</title>
<style>
  body { font-family: system-ui, "Segoe UI", "Microsoft YaHei", sans-serif; margin: 0; padding: 40px; line-height: 1.7; color: #1a1a1a; }
  code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }
  blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; margin-left: 0; }
  table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  th, td { border: 1px solid #dfe2e5; padding: 8px 12px; }
  th { background: #f6f8fa; }
  img { max-width: 100%; page-break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
  @media print { pre, code { white-space: pre-wrap !important; word-wrap: break-word; } }
</style>
</head><body>${html}</body></html>`;
        await pdfWindow.loadURL(
          `data:text/html;charset=UTF-8,${encodeURIComponent(fullHtml)}`
        );
        const buf = await pdfWindow.webContents.printToPDF({
          pageSize: "A4",
          margins: { marginType: 0 },
          printBackground: true,
          pageRanges: ""
        });
        await writeFile(outPath, buf);
        log.info("pdf exported:", outPath);
        return outPath;
      } catch (e) {
        log.error("export-pdf failed", e);
        electron.dialog.showErrorBox("导出 PDF 失败", String(e));
        return null;
      } finally {
        if (pdfWindow && !pdfWindow.isDestroyed()) {
          pdfWindow.destroy();
        }
      }
    }
  );
  electron.ipcMain.handle(
    "invoke:export-md",
    async (_event, markdown, defaultName) => {
      const outPath = await saveAsDialog(defaultName, ["md", "markdown"], "Markdown");
      if (!outPath) return null;
      try {
        await writeFile(outPath, markdown);
        log.info("markdown exported:", outPath);
        return outPath;
      } catch (e) {
        log.error("export-md failed", e);
        return null;
      }
    }
  );
}
function registerWindowIpcHandlers() {
  electron.ipcMain.handle(
    "invoke:window-show-item-in-folder",
    async (_event, filePath) => {
      try {
        electron.shell.showItemInFolder(filePath);
      } catch (e) {
        log.error("showItemInFolder failed", e);
      }
    }
  );
  electron.ipcMain.handle(
    "invoke:window-get-native-theme",
    async () => {
      if (electron.nativeTheme.themeSource === "system") return "auto";
      return electron.nativeTheme.shouldUseDarkColors ? "dark" : "light";
    }
  );
  void electron.app.name;
}
exports.mainWindow = null;
function sendToRenderer(channel, ...args) {
  if (exports.mainWindow && !exports.mainWindow.isDestroyed()) {
    exports.mainWindow.webContents.send(channel, ...args);
  }
}
function createWindow() {
  log.info("Creating main window...");
  exports.mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: false,
    icon: path.join(__dirname, "../../resources/icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "../preload/index.js"),
      webSecurity: true
    }
  });
  exports.mainWindow.on("ready-to-show", () => {
    exports.mainWindow?.show();
    log.info("Main window shown");
  });
  exports.mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    exports.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    exports.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  exports.mainWindow.on("closed", () => {
    exports.mainWindow = null;
    log.info("Main window closed");
  });
}
function registerAllIpc() {
  registerFileIpcHandlers();
  registerDialogIpcHandlers();
  registerConfigIpcHandlers();
  registerImageIpcHandlers();
  registerExportIpcHandlers();
  registerWindowIpcHandlers();
  log.debug("All IPC handlers registered");
}
function processArgvFile() {
  if (process.argv.length > 1) {
    const args = process.argv.slice(utils.is.dev ? 2 : 1);
    for (const a of args) {
      const low = a.toLowerCase();
      if (low.endsWith(".md") || low.endsWith(".markdown")) {
        return a;
      }
    }
  }
  return null;
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.my-markdown.app");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.nativeTheme.themeSource = "system";
  registerAllIpc();
  buildMenu();
  setupSingleInstance((filePath) => {
    log.info("Second instance sent file:", filePath);
    sendToRenderer("on:file-opened", filePath);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  const argvFile = processArgvFile();
  if (argvFile && exports.mainWindow) {
    exports.mainWindow.once("ready-to-show", () => {
      sendToRenderer("on:file-opened", argvFile);
    });
  }
  log.info("App ready, version:", electron.app.getVersion());
});
electron.app.on("open-file", (e, filePath) => {
  e.preventDefault();
  log.info("open-file event:", filePath);
  const low = filePath.toLowerCase();
  if (low.endsWith(".md") || low.endsWith(".markdown")) {
    if (!exports.mainWindow) {
      electron.app.whenReady().then(() => sendToRenderer("on:file-opened", filePath));
    } else {
      sendToRenderer("on:file-opened", filePath);
    }
  }
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
