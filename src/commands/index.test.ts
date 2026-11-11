import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import pkg from '../../package.json' with { type: 'json' }
import { run } from './index.ts'

function capture(argv: string[]) {
  const out = { code: 0, stderr: '', stdout: '' }
  out.code = run(argv, {
    stderr: text => {
      out.stderr += text
    },
    stdout: text => {
      out.stdout += text
    },
  })
  return out
}

describe('run', () => {
  it('prints the help for --help and -h', () => {
    for (const flag of ['--help', '-h']) {
      const { code, stderr, stdout } = capture([flag])
      assert.equal(code, 0)
      assert.equal(stderr, '')
      assert.match(stdout, /^Usage: agentic-repo/)
    }
  })

  it('prints the help for a bare run', () => {
    const { code, stdout } = capture([])
    assert.equal(code, 0)
    assert.match(stdout, /^Usage: agentic-repo/)
  })

  it('prints the package version for --version and -v', () => {
    for (const flag of ['--version', '-v']) {
      const { code, stdout } = capture([flag])
      assert.equal(code, 0)
      assert.equal(stdout, `${pkg.version}\n`)
    }
  })

  it('fails on an unknown command', () => {
    const { code, stderr, stdout } = capture(['deploy'])
    assert.equal(code, 1)
    assert.equal(stdout, '')
    assert.match(stderr, /Unknown command "deploy"/)
  })

  it('fails on an unknown option', () => {
    const { code, stderr } = capture(['--force'])
    assert.equal(code, 1)
    assert.match(stderr, /--force/)
  })
})
