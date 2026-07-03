export type ProtectedFolderName = "Documents" | "Desktop" | "Downloads";

export type PrivacyPane = "full-disk-access" | "documents" | "desktop" | "downloads";

export interface SystemPermissionsStatus {
  platform: NodeJS.Platform;
  /** Always true on non-macOS platforms; there's nothing equivalent to check. */
  fullDiskAccess: boolean;
}

export interface FolderAccessResult {
  granted: boolean;
  error?: string;
}

declare global {
  interface Window {
    electron?: {
      selectDirectory: () => Promise<string | null>;
      checkSystemPermissions?: () => Promise<SystemPermissionsStatus>;
      requestFolderAccess?: (folder: ProtectedFolderName) => Promise<FolderAccessResult>;
      openPrivacySettings?: (pane: PrivacyPane) => Promise<boolean>;
    };
  }
}

export {};
