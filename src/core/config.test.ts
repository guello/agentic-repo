import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'

import {
  type Layer,
  type Resolved,
  type Result,
  configJsonSchema,
  fieldSource,
  merge,
  parseLayer,
  resolveConfig,
} from './config.ts'
import { defaultsLayer } from './defaults.ts'

const read = (path: string): Promise<string> => readFile(new URL(path, import.meta.url), 'utf8')

const layer = (text: string, source: string): Layer => {
  const result = parseLayer(text, source)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const unwrap = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const owner = layer(
  'backend: user\nproject: { owner: guello, number: 1 }\nengines: { reviewer: codex }\n',
  'guello/.github'
)

const errorOf = (result: Result<unknown>): string => {
  assert.equal(result.ok, false)
  return result.ok ? '' : result.error
}

describe('parseLayer', () => {
  it('accepts an empty file', () => {
    assert.deepEqual(layer('', 'repo').data, {})
  })

  it('accepts a file with only one matrix cell', () => {
    assert.deepEqual(layer('routing: { matrix: { M: { P0: standard } } }', 'repo').data, {
      routing: { matrix: { M: { P0: 'standard' } } },
    })
  })

  const rejects: [string, string, RegExp][] = [
    ['an unknown key', 'engine: claude', /engine/],
    ['an unknown nested key', 'review: { rounds: 3 }', /rounds/],
    ['an unknown engine', 'engines: { default: gpt }', /engines\.default/],
    [
      'an unknown matrix cell',
      'routing: { matrix: { M: { P0: huge } } }',
      /routing\.matrix\.M\.P0/,
    ],
    ['an unknown Effort key', 'routing: { matrix: { XXL: { P0: deep } } }', /XXL/],
    ['a project number of 0', 'project: { owner: guello, number: 0 }', /project\.number/],
    ['a list as the root', '- backend: org', /expected object/],
    ['a YAML syntax error', 'backend: [org', /repo:/],
    ['a duplicate key', 'backend: org\nbackend: user', /unique/i],
    ['two YAML documents', 'backend: org\n---\nbackend: user', /repo:/],
  ]

  for (const [name, text, pattern] of rejects) {
    it(`rejects ${name}`, () => {
      assert.match(errorOf(parseLayer(text, 'repo')), pattern)
    })
  }
})

describe('merge', () => {
  it('merges objects key by key, and replaces lists and values', () => {
    assert.deepEqual(
      merge({ a: { b: 1, c: 2 }, d: [1, 2], e: 'x' }, { a: { c: 3 }, d: [3], e: 'y' }),
      {
        a: { b: 1, c: 3 },
        d: [3],
        e: 'y',
      }
    )
  })
})

describe('resolveConfig', () => {
  it('resolves the package defaults with an owner file', () => {
    const { config, sources } = unwrap(resolveConfig(defaultsLayer, owner))
    assert.equal(config.backend, 'user')
    assert.deepEqual(config.engines, { default: 'claude', reviewer: 'codex' })
    assert.equal(config.review.maxRounds, 2)
    assert.equal(sources.get('project.owner'), 'guello/.github')
    assert.equal(sources.get('routing.matrix.M.P0'), 'package defaults')
  })

  it('changes only the keys of the repo file', () => {
    const repo = layer(
      'engines: { default: codex }\nrouting: { matrix: { M: { P0: standard } } }',
      'guello/app'
    )
    const { config, sources }: Resolved = unwrap(resolveConfig(defaultsLayer, owner, repo))
    assert.deepEqual(config.engines, { default: 'codex', reviewer: 'codex' })
    assert.equal(config.routing.matrix.M.P0, 'standard')
    assert.equal(config.routing.matrix.M.P1, 'standard')
    assert.equal(config.routing.matrix.L.P0, 'deep')
    assert.equal(sources.get('routing.matrix.M.P0'), 'guello/app')
    assert.equal(sources.get('engines.reviewer'), 'guello/.github')
  })

  it('takes each value from the last file that sets it', () => {
    const team = layer(
      'backend: org\nproject: { owner: squonk, number: 2 }\nengines: { default: codex }\nfields: { effort: { options: { XS: Tiny } } }',
      'squonk/.github'
    )
    const repo = layer(
      'engines: { default: gemini }\nfields: { effort: { options: { XL: Huge } } }',
      'squonk/app'
    )
    const { config, sources } = unwrap(resolveConfig(defaultsLayer, team, repo))
    assert.equal(config.engines.default, 'gemini')
    assert.equal(sources.get('engines.default'), 'squonk/app')
    assert.deepEqual(config.fields.effort, { name: 'Effort', options: { XL: 'Huge', XS: 'Tiny' } })
    assert.equal(sources.get('fields.effort.options.XS'), 'squonk/.github')
    assert.equal(sources.get('fields.effort.name'), 'package defaults')
  })

  it('gives an empty object its own source', () => {
    const repo = layer('fields: { effort: { options: {} } }', 'guello/app')
    assert.equal(
      unwrap(resolveConfig(defaultsLayer, owner, repo)).sources.get('fields.effort.options'),
      'guello/app'
    )
  })

  it('rejects root in the owner file', () => {
    const rooted = layer(
      'root: true\nbackend: user\nproject: { owner: guello, number: 1 }',
      'guello/.github'
    )
    assert.match(
      errorOf(resolveConfig(defaultsLayer, rooted)),
      /guello\/\.github: root applies only to a repo file/
    )
  })

  it('skips the owner file when the repo file has root: true', () => {
    const repo = layer(
      'root: true\nbackend: org\nproject: { owner: squonk, number: 2 }',
      'squonk/app'
    )
    const { config, sources } = unwrap(resolveConfig(defaultsLayer, owner, repo))
    assert.deepEqual(config.engines, { default: 'claude' })
    assert.equal(config.project.owner, 'squonk')
    assert.equal(sources.has('root'), false)
  })

  it('fails when no file sets the backend and the project', () => {
    const error = errorOf(resolveConfig(defaultsLayer))
    assert.match(error, /backend/)
    assert.match(error, /project/)
  })

  it('fails when a personal account reads a field from the issue', () => {
    const repo = layer('fields: { effort: { source: issue } }', 'guello/app')
    assert.match(errorOf(resolveConfig(defaultsLayer, owner, repo)), /fields\.effort\.source/)
  })
})

describe('fieldSource', () => {
  it('reads issue values on the org backend and project values on the user backend', () => {
    const user = unwrap(resolveConfig(defaultsLayer, owner)).config
    const org = { ...user, backend: 'org' as const }
    assert.equal(fieldSource(user, 'type'), 'project')
    assert.equal(fieldSource(org, 'type'), 'issue')
    assert.equal(
      fieldSource(
        { ...org, fields: { ...org.fields, effort: { name: 'Size', source: 'project' } } },
        'effort'
      ),
      'project'
    )
  })
})

describe('configJsonSchema', () => {
  it('matches the committed schema.json', async () => {
    assert.deepEqual(JSON.parse(await read('../../schema.json')), configJsonSchema())
  })
})
