import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { branchName, commitTypeFor, maxSlugLength, slug } from './branch.ts'

describe('slug', () => {
  it('makes lower case ASCII words with hyphens', () => {
    assert.equal(slug('Fix the Login redirect'), 'fix-the-login-redirect')
    assert.equal(slug('  Add `route` to the CLI: v2!  '), 'add-route-to-the-cli-v2')
  })

  it('removes accents', () => {
    assert.equal(slug('Créer la tâche déjà prévue'), 'creer-la-tache-deja-prevue')
  })

  it('maps letters that have no accent form to ASCII', () => {
    assert.equal(slug('Straße in København, Łódź'), 'strasse-in-kobenhavn-lodz')
  })

  it('cuts at a word boundary at 40 characters at most', () => {
    const result = slug('Move the merge gate rerun into the reconcile workflow')
    assert.equal(result, 'move-the-merge-gate-rerun-into-the')
    assert.ok(result.length <= maxSlugLength)
  })

  it('keeps a cut that ends at a word end', () => {
    const title = `${'a'.repeat(39)} b`
    assert.equal(slug(title), 'a'.repeat(39))
    assert.equal(slug(`${'a'.repeat(40)} b`), 'a'.repeat(40))
  })

  it('cuts one long word at 40 characters', () => {
    assert.equal(slug('x'.repeat(60)), 'x'.repeat(maxSlugLength))
  })

  it('gives an empty slug for a title with no ASCII letters or digits', () => {
    assert.equal(slug('修复登录 🚀'), '')
  })
})

describe('branchName', () => {
  it('names a local branch <type>/<issue>-<slug>', () => {
    assert.equal(
      branchName({ ci: false, issue: 42, title: 'Fix login', type: 'fix' }),
      'fix/42-fix-login'
    )
  })

  it('adds agent/ in front for CI runs', () => {
    assert.equal(
      branchName({ ci: true, issue: 7, title: 'Add docs', type: 'docs' }),
      'agent/docs/7-add-docs'
    )
  })

  it('drops the hyphen when the slug is empty', () => {
    assert.equal(branchName({ ci: false, issue: 9, title: '🚀', type: 'feat' }), 'feat/9')
  })
})

describe('commitTypeFor', () => {
  it('maps Bug, Feature and Task in any case', () => {
    assert.equal(commitTypeFor('Bug'), 'fix')
    assert.equal(commitTypeFor('feature'), 'feat')
    assert.equal(commitTypeFor('TASK'), 'chore')
  })

  it('has no type for Epic, Spec, another type or no type', () => {
    for (const issueType of ['Epic', 'Spec', 'Chore', 'constructor', undefined]) {
      assert.equal(commitTypeFor(issueType), undefined)
    }
  })
})
