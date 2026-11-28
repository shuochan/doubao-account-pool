import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { app, type BrowserWindow, type DownloadItem, type Event, type WebContents } from "electron";
import log from "electron-log/main.js";

export function videoOutputDirectory(outputDir: string) {
  return outputDir.trim() || path.join(app.getPath("userData"), "videos");
}

export function enableSilentVideoDownloads(win: BrowserWindow, getOutputDir: () => string) {
  const contents = win.webContents;
  const accountSession = contents.session;
  const onDownload = (event: Event, item: DownloadItem, source: WebContents) => {
    if (source !== contents) return;
    if (item.getMimeType().toLowerCase() !== "video/mp4" && path.extname(item.getFilename()).toLowerCase() !== ".mp4") return;

    try {
      const directory = path.resolve(videoOutputDirectory(getOutputDir()));
      mkdirSync(directory, { recursive: true });
      item.setSavePath(path.join(directory, `${randomUUID()}.mp4`));
    } catch (error) {
      event.preventDefault();
      log.error("无法静默保存豆包视频", error);
    }
  };
  accountSession.on("will-download", onDownload);
  win.once("closed", () => accountSession.removeListener("will-download", onDownload));
}
