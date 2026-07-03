/* eslint-disable */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  checkSystemPermissions: () => ipcRenderer.invoke("check-system-permissions"),
  requestFolderAccess: (folderName) => ipcRenderer.invoke("request-folder-access", folderName),
  openPrivacySettings: (pane) => ipcRenderer.invoke("open-privacy-settings", pane),
});
