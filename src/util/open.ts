import { exec } from "node:child_process";
import { platform } from "node:process";

export function openFileExplorer(targetPath: string): void {
  const normalizedPath = targetPath.replace(/"/g, '\\"');
  
  const cmd = platform === "win32" ? "explorer" : platform === "darwin" ? "open" : "xdg-open";
  exec(`${cmd} "${normalizedPath}"`, () => {
    // Ignore errors for best-effort operation
  });
}


