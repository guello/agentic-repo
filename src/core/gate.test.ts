import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  type IssueSnapshot,
  type MergeBlock,
  type PullRequestSnapshot,
  type StartBlock,
  describeMergeBlock,
  describeStartBlock,
  dispatchLabels,
  mergeGate,
  startGate,
} from './gate.ts'

const ready: IssueSnapshot = {
  blockedBy: [{ number: 3, open: false }],
  closingPullRequests: [{ number: 30, open: false }],
  effort: 'S',
  labels: ['agent', 'area: cli'],
  linkedBranches: [],
  number: 42,
  open: true,
  priority: 'P1',
  subIssues: [{ number: 43, open: false }],
}

const codesOf = (blocks: { code: string }[]): string[] => blocks.map(block => block.code)

describe('startGate', () => {
  it('passes a ready issue: closed blockers, sub-issues and PRs do not count', () => {
    assert.deepEqual(startGate(ready), [])
  })

  const cases: [string, Partial<IssueSnapshot>, StartBlock][] = [
    ['a closed issue', { open: false }, { code: 'closed' }],
    [
      'a needs-* label',
      { labels: ['agent', 'needs-info'] },
      { code: 'label', labels: ['needs-info'] },
    ],
    ['agent-failed', { labels: ['agent-failed'] }, { code: 'label', labels: ['agent-failed'] }],
    [
      'an open blocker',
      { blockedBy: [{ number: 5, open: true }] },
      { code: 'blocked', issues: [5] },
    ],
    [
      'open sub-issues',
      { subIssues: [{ number: 44, open: true }] },
      { code: 'container', issues: [44] },
    ],
    [
      'a linked branch',
      { linkedBranches: ['fix/42-a'] },
      { branches: ['fix/42-a'], code: 'branch' },
    ],
    [
      'an open closing PR',
      { closingPullRequests: [{ number: 31, open: true }] },
      { code: 'pull-request', pullRequests: [31] },
    ],
    ['no Effort', { effort: undefined }, { code: 'fields', missing: ['effort'] }],
    ['no Priority', { priority: undefined }, { code: 'fields', missing: ['priority'] }],
    ['an XL Effort', { effort: 'XL' }, { code: 'xl' }],
  ]

  for (const [name, change, block] of cases) {
    it(`blocks ${name}`, () => {
      assert.deepEqual(startGate({ ...ready, ...change }), [block])
    })
  }

  it('reports each reason in the order of the spec', () => {
    const blocks = startGate({
      ...ready,
      blockedBy: [{ number: 5, open: true }],
      effort: undefined,
      labels: ['needs-triage'],
      open: false,
    })
    assert.deepEqual(codesOf(blocks), ['closed', 'label', 'blocked', 'fields'])
  })

  it('has a description for each reason', () => {
    for (const testCase of cases) assert.match(describeStartBlock(testCase[2]), /^\S.*\.$/)
    assert.equal(describeStartBlock({ code: 'blocked', issues: [5, 6] }), 'Open blockers: #5, #6.')
    assert.equal(
      describeStartBlock({ code: 'fields', missing: ['effort', 'priority'] }),
      'The issue has no value for: Effort, Priority.'
    )
  })
})

describe('dispatchLabels', () => {
  it('adds needs-triage for missing fields', () => {
    assert.deepEqual(dispatchLabels([{ code: 'fields', missing: ['effort'] }]), ['needs-triage'])
  })

  it('adds needs-spec for XL', () => {
    assert.deepEqual(dispatchLabels([{ code: 'xl' }]), ['needs-spec'])
  })

  it('adds only needs-triage when an XL issue also misses a field', () => {
    assert.deepEqual(dispatchLabels([{ code: 'fields', missing: ['priority'] }, { code: 'xl' }]), [
      'needs-triage',
    ])
  })

  it('adds no label to a container, so that the dispatcher can fan out', () => {
    assert.deepEqual(dispatchLabels([{ code: 'container', issues: [44] }, { code: 'xl' }]), [])
  })

  it('adds no label for the other reasons', () => {
    assert.deepEqual(dispatchLabels([{ code: 'closed' }, { code: 'blocked', issues: [5] }]), [])
  })
})

const mergeable: PullRequestSnapshot = {
  closes: [
    { blockedBy: [{ number: 3, open: false }], labels: ['agent'], number: 12 },
    { blockedBy: [], labels: [], number: 14 },
  ],
  labels: ['area: cli'],
}

describe('mergeGate', () => {
  it('passes a PR with no hold labels and no open blockers', () => {
    assert.deepEqual(mergeGate(mergeable), [])
  })

  const cases: [string, PullRequestSnapshot, MergeBlock[]][] = [
    [
      'needs-review on the PR',
      { ...mergeable, labels: ['needs-review'] },
      [{ code: 'pull-request-label', labels: ['needs-review'] }],
    ],
    [
      'do-not-merge on the PR',
      { ...mergeable, labels: ['do-not-merge'] },
      [{ code: 'pull-request-label', labels: ['do-not-merge'] }],
    ],
    [
      'a needs-* label on a closed issue',
      { ...mergeable, closes: [{ blockedBy: [], labels: ['needs-spec'], number: 12 }] },
      [{ code: 'issue-label', issue: 12, labels: ['needs-spec'] }],
    ],
    [
      'agent-failed on a closed issue',
      { ...mergeable, closes: [{ blockedBy: [], labels: ['agent-failed'], number: 14 }] },
      [{ code: 'issue-label', issue: 14, labels: ['agent-failed'] }],
    ],
    [
      'an open blocker of a closed issue',
      {
        ...mergeable,
        closes: [{ blockedBy: [{ number: 5, open: true }], labels: [], number: 12 }],
      },
      [{ blockers: [5], code: 'issue-blocked', issue: 12 }],
    ],
  ]

  for (const [name, pullRequest, blocks] of cases) {
    it(`blocks ${name}`, () => {
      assert.deepEqual(mergeGate(pullRequest), blocks)
    })
  }

  it('matches label names in any case, as GitHub does', () => {
    assert.deepEqual(mergeGate({ ...mergeable, labels: ['Do-Not-Merge'] }), [
      { code: 'pull-request-label', labels: ['Do-Not-Merge'] },
    ])
    assert.deepEqual(startGate({ ...ready, labels: ['Needs-Info', 'AGENT-FAILED'] }), [
      { code: 'label', labels: ['Needs-Info', 'AGENT-FAILED'] },
    ])
  })

  it('ignores needs-* labels on the PR other than needs-review', () => {
    assert.deepEqual(mergeGate({ ...mergeable, labels: ['needs-triage'] }), [])
  })

  it('has a description for each reason', () => {
    for (const block of cases.flatMap(testCase => testCase[2])) {
      assert.match(describeMergeBlock(block), /^\S.*\.$/)
    }
    assert.equal(
      describeMergeBlock({ blockers: [5], code: 'issue-blocked', issue: 12 }),
      '#12 has open blockers: #5.'
    )
  })
})
