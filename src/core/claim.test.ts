import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { closingLine, resolveClaim } from './claim.ts'

describe('resolveClaim', () => {
  it('keeps a branch that is the only linked branch', () => {
    assert.deepEqual(resolveClaim(['fix/42-a'], 'fix/42-a'), { action: 'keep' })
  })

  it('keeps the oldest branch when two executors race', () => {
    assert.deepEqual(resolveClaim(['fix/42-a', 'agent/fix/42-a'], 'fix/42-a'), { action: 'keep' })
  })

  it('yields each newer branch to the oldest one', () => {
    const branches = ['fix/42-a', 'agent/fix/42-a', 'feat/42-a']
    assert.deepEqual(resolveClaim(branches, 'agent/fix/42-a'), { action: 'yield', holder: 'fix/42-a' })
    assert.deepEqual(resolveClaim(branches, 'feat/42-a'), { action: 'yield', holder: 'fix/42-a' })
  })

  it('reports a branch that is not in the linked list', () => {
    assert.deepEqual(resolveClaim(['fix/42-a'], 'fix/42-b'), { action: 'missing' })
    assert.deepEqual(resolveClaim([], 'fix/42-b'), { action: 'missing' })
  })
})

describe('closingLine', () => {
  it('closes one issue', () => {
    assert.equal(closingLine([12]), 'Closes #12')
  })

  it('gives each issue its own keyword', () => {
    assert.equal(closingLine([12, 14]), 'Closes #12, closes #14')
  })
})
