import { contextBridge, ipcRenderer } from "electron";

export interface ElectronPOSApi {
  isElectron: boolean;
  platform: string;
  printThermalReceipt: (options: { host: string; port: number; bytes: number[] }) => Promise<{ success: boolean; message: string }>;
  kickCashDrawer: (options: { host: string; port: number; pin?: "PIN_2" | "PIN_5" }) => Promise<{ success: boolean; message: string }>;
  toggleKiosk: () => Promise<boolean>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  getSystemInfo: () => Promise<{ hostname: string; platform: string; arch: string }>;
}

const api: ElectronPOSApi = {
  isElectron: true,
  platform: process.platform,

  printThermalReceipt: (options) => ipcRenderer.invoke("pos:print-receipt", options),
  kickCashDrawer: (options) => ipcRenderer.invoke("pos:kick-drawer", options),
  toggleKiosk: () => ipcRenderer.invoke("pos:toggle-kiosk"),
  minimizeWindow: () => ipcRenderer.send("pos:minimize"),
  maximizeWindow: () => ipcRenderer.send("pos:maximize"),
  closeWindow: () => ipcRenderer.send("pos:close"),
  getSystemInfo: () => ipcRenderer.invoke("pos:system-info"),
};

contextBridge.exposeInMainWorld("electronPOS", api);
