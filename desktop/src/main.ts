import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { DesktopPrinterTransport } from "./hardware/printer";
import { DesktopCashDrawer } from "./hardware/drawer";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "FoodBaskets POS — Point of Sale",
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#141a2e",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const distPath = path.join(__dirname, "..", "dist", "index.html");
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    // If production dist not built yet, fallback to dev server
    mainWindow.loadURL("http://localhost:8081");
  }

  // Keyboard accelerators for POS function keys
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown") {
      if (input.key === "F11") {
        mainWindow?.webContents.send("pos:shortcut", "BYPASS_TOGGLE");
      } else if (input.key === "F12") {
        mainWindow?.webContents.send("pos:shortcut", "BYPASS_REMOVE");
      } else if (input.key === "F4") {
        mainWindow?.webContents.send("pos:shortcut", "CANCEL_TRANSACTION");
      } else if (input.key === "F3") {
        mainWindow?.webContents.send("pos:shortcut", "REFUND");
      } else if (input.control && (input.key.toLowerCase() === "p")) {
        mainWindow?.webContents.send("pos:shortcut", "PAYMENT");
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ───────────────────────────────────────────────

ipcMain.handle("pos:print-receipt", async (_event, options: { host: string; port: number; bytes: number[] }) => {
  try {
    const buffer = Buffer.from(options.bytes);
    return await DesktopPrinterTransport.sendRawToNetworkPrinter({
      host: options.host,
      port: options.port,
      data: buffer,
    });
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
});

ipcMain.handle("pos:kick-drawer", async (_event, options: { host: string; port: number; pin?: "PIN_2" | "PIN_5" }) => {
  try {
    return await DesktopCashDrawer.kickViaNetworkPrinter(options.host, options.port, options.pin || "PIN_2");
  } catch (err: any) {
    return { success: false, message: err?.message || String(err) };
  }
});

ipcMain.handle("pos:toggle-kiosk", () => {
  if (!mainWindow) return false;
  const isKiosk = mainWindow.isKiosk();
  mainWindow.setKiosk(!isKiosk);
  return !isKiosk;
});

ipcMain.on("pos:minimize", () => mainWindow?.minimize());
ipcMain.on("pos:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on("pos:close", () => mainWindow?.close());

ipcMain.handle("pos:system-info", () => {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
  };
});

// ─── App Lifecycle ───────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
