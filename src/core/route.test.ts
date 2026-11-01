import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { efforts, priorities } from './fields.ts'
import { type Cell, type RouteConfig, route } from './route.ts'

const config: RouteConfig = {
  engines: { default: 'claude', reviewer: 'codex' },
  routing: {
    matrix: {
      L: { P0: 'deep', P1: 'deep', P2: 'deep', P3: 'deep' },
      M: { P0: 'deep', P1: 'standard', P2: 'standard', P3: 'standard' },
      S: { P0: 'standard', P1: 'fast', P2: 'fast', P3: 'fast' },
      XL: { P0: 'split', P1: 'split', P2: 'split', P3: 'split' },
      XS: { P0: 'fast', P1: 'fast', P2: 'fast', P3: 'fast' },
    },
    models: {
      claude: {
        deep: { effort: 'high', model: 'opus' },
        fast: { effort: 'low', model: 'haiku' },
        standard: { effort: 'medium', model: 'sonnet' },
      },
      codex: {
        deep: { effort: 'high', model: 'gpt-6-astra' },
        fast: { effort: 'low', model: 'gpt-6-luna' },
        standard: { effort: 'medium', model: 'gpt-6.1-sol' },
      },
      gemini: {
        deep: { effort: 'high', model: 'gemini-4-argon' },
        fast: { effort: 'low', model: 'gemini-3.6-flash' },
        standard: { effort: 'medium', model: 'gemini-4-argon' },
      },
    },
    roles: { architect: 'deep', reviewer: 'deep', triage: 'fast' },
  },
}

const expected: Record<string, Cell[]> = {
  L: ['deep', 'deep', 'deep', 'deep'],
  M: ['deep', 'standard', 'standard', 'standard'],
  S: ['standard', 'fast', 'fast', 'fast'],
  XL: ['split', 'split', 'split', 'split'],
  XS: ['fast', 'fast', 'fast', 'fast'],
}

describe('route', () => {
  for (const effort of efforts) {
    for (const [index, priority] of priorities.entries()) {
      const cell = expected[effort]?.[index]
      it(`routes an implementer with ${effort} and ${priority} to ${cell}`, () => {
        const result = route({ effort, priority, role: 'implementer' }, config)
        if (cell === 'split') {
          assert.deepEqual(result, { label: 'needs-spec', run: false })
          return
        }
        assert.equal(result.run && result.tier, cell)
        assert.equal(result.run && result.review, cell === 'deep')
      })
    }
  }

  it('picks the model and the effort of the default engine', () => {
    assert.deepEqual(route({ effort: 'S', priority: 'P0', role: 'implementer' }, config), {
      effort: 'medium',
      engine: 'claude',
      model: 'sonnet',
      review: false,
      run: true,
      tier: 'standard',
    })
  })

  it('holds an implementer without Effort or Priority for triage', () => {
    assert.deepEqual(route({ priority: 'P1', role: 'implementer' }, config), { label: 'needs-triage', run: false })
    assert.deepEqual(route({ effort: 'S', role: 'implementer' }, config), { label: 'needs-triage', run: false })
  })

  it('routes the other roles by their fixed tier, with no fields', () => {
    const triage = route({ role: 'triage' }, config)
    const architect = route({ role: 'architect' }, config)
    assert.equal(triage.run && `${triage.engine} ${triage.model}`, 'claude haiku')
    assert.equal(architect.run && `${architect.engine} ${architect.model}`, 'claude opus')
  })

  it('routes the reviewer to the reviewer engine, with no review flag', () => {
    const result = route({ effort: 'L', priority: 'P0', role: 'reviewer' }, config)
    assert.deepEqual(result, {
      effort: 'high',
      engine: 'codex',
      model: 'gpt-6-astra',
      review: false,
      run: true,
      tier: 'deep',
    })
  })

  it('routes the reviewer to the default engine when no reviewer engine is set', () => {
    const result = route({ role: 'reviewer' }, { ...config, engines: { default: 'gemini' } })
    assert.equal(result.run && result.engine, 'gemini')
  })
})
