import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import electron from 'electron'

test('daily provider exhaustion and atomic failover in isolated databases', async t => {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
  const result = spawnSync(electron, [fileURLToPath(new URL('./quota-exhaustion.electron.mjs', import.meta.url))], { env, encoding: 'utf8', timeout: 30000 })
  const line = result.stdout.split('\n').find(line => line.startsWith('EXHAUSTION_RESULTS '))
  assert.ok(line, result.stdout + result.stderr)
  const cases = JSON.parse(line.slice('EXHAUSTION_RESULTS '.length))
  const profile = result.stdout.split('\n').find(line => line.startsWith('EXHAUSTION_PROFILE '))?.slice('EXHAUSTION_PROFILE '.length)
  try {
    assert.equal(cases.length, 16)
    for (const item of cases) await t.test(item.name, () => assert.equal(item.ok, true, item.error))
    assert.equal(result.status, 0, result.stderr)
  } finally {
    if (profile) fs.rmSync(profile, { recursive: true, force: true })
  }
})
