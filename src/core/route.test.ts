import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { type Cell, parseLayer, resolveConfig } from './config.ts'
import { defaultsLayer } from './defaults.ts'
import { type Effort, efforts, priorities } from './fields.ts'
import { route } from './route.ts'

function parse(text: string, source: string) {
  const result = parseLayer(text, source)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const owner = parse(
  'backend: user\nproject: { owner: guello, number: 1 }\nengines: { reviewer: codex }',
  'owner',
)
const resolved = resolveConfig(defaultsLayer, owner)
if (!resolved.ok) throw new Error(resolved.error)
const { config } = resolved.value!

const expected: Record<Effort, Cell[]> = {
  L: ['deep', 'deep', 'deep', 'deep'],
  M: ['deep', 'standard', 'standard', 'standard'],
  S: ['standard', 'fast', 'fast', 'fast'],
  XL: ['split', 'split', 'split', 'split'],
  XS: ['fast', 'fast', 'fast', 'fast'],
}

describe('route', () => {
  for (const effort of efforts) {
    for (const [index, priority] of priorities.entries()) {
      const cell = expected[effort][index]
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

  it('holds the models of the spec for each engine and tier', () => {
    const column = (fast: string, standard: string, deep: string) => ({
      deep: { effort: 'high', model: deep },
      fast: { effort: 'low', model: fast },
      standard: { effort: 'medium', model: standard },
    })
    assert.deepEqual(config.routing.models, {
      claude: column('haiku', 'sonnet', 'opus'),
      codex: column('gpt-6-luna', 'gpt-6.1-sol', 'gpt-6-astra'),
      gemini: column('gemini-3.6-flash', 'gemini-4-argon', 'gemini-4-argon'),
    })
    assert.deepEqual(config.routing.roles, { architect: 'deep', reviewer: 'deep', triage: 'fast' })
  })

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
    assert.deepEqual(route({ priority: 'P1', role: 'implementer' }, config), {
      label: 'needs-triage',
      run: false,
    })
    assert.deepEqual(route({ effort: 'S', role: 'implementer' }, config), {
      label: 'needs-triage',
      run: false,
    })
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
