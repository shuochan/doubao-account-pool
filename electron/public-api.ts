import type { ApiRequest } from "./types.js";

export function toPublicApiRequest(request: ApiRequest, apiBaseUrl?: string) {
  const videoDownloadPath = request.outputVideoPath
    ? `/api/requests/${encodeURIComponent(request.requestId)}/video`
    : null;
  const videoDownloadUrl = videoDownloadPath && apiBaseUrl
    ? `${apiBaseUrl.replace(/\/$/, "")}${videoDownloadPath}`
    : videoDownloadPath;
  return {
    requestId: request.requestId,
    status: request.status,
    message: request.message,
    error: request.error,
    model: request.model,
    aspectRatio: request.aspectRatio,
    cleanVideoUrl: request.cleanVideoUrl || videoDownloadUrl,
    videoDownloadUrl,
    outputVideoPath: request.outputVideoPath,
    quotaRefunded: request.quotaRefunded,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    finishedAt: request.finishedAt
  };
}
