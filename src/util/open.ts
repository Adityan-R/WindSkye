import { exec } from "node:child_process";
import { platform } from "node:process";

export function openFileExplorer(targetPath: string): void {
  const normalizedPath = targetPath.replace(/"/g, '\\"');
  
  let command = "";
  switch (platform) {
    case "win32":
      // In Windows, explorer accepts a path
      command = `explorer "${normalizedPath}"`;
      break;
    case "darwin":
      command = `open "${normalizedPath}"`;
      break;
    default:
      command = `xdg-open "${normalizedPath}"`;
      break;
  }

  exec(command, (error) => {
    // We ignore errors since this is a best-effort operation
  });
}


