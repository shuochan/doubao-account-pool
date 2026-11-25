import assert from 'node:assert/strict'
import test from 'node:test'

import { toPublicApiRequest } from '../dist-electron/public-api.js'

const request = {
  requestId: 'doubao-fixture',
  status: 'success',
  message: 'ok',
  error: null,
  model: 'seedance_2_0_mini',
  aspectRatio: '16:9',
  cleanVideoUrl: null,
  outputVideoPath: 'C:\\videos\\doubao-fixture.mp4',
  quotaRefunded: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:01.000Z',
  finishedAt: '2026-01-01T00:00:01.000Z',
}

test('returns an authenticated LAN download URL for a verified local MP4', () => {
  const result = toPublicApiRequest(request, 'http://192.168.110.102:17889')
  assert.equal(result.cleanVideoUrl, 'http://192.168.110.102:17889/api/requests/doubao-fixture/video')
  assert.equal(result.videoDownloadUrl, result.cleanVideoUrl)
})
