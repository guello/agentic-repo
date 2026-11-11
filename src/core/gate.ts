import type { Effort, Priority } from './fields.ts'
import { isHoldLabel, labels, sameLabel } from './labels.ts'

export interface IssueRef {
  number: number
  open: boolean
}

export interface IssueSnapshot {
  blockedBy: IssueRef[]
  closingPullRequests: IssueRef[]
  effort?: Effort
  labels: string[]
  linkedBranches: string[]
  number: number
  open: boolean
  priority?: Priority
  subIssues: IssueRef[]
}

export type Field = 'effort' | 'priority'

export type StartBlock =
  | { code: 'blocked'; issues: number[] }
  | { code: 'branch'; branches: string[] }
  | { code: 'closed' }
  | { code: 'container'; issues: number[] }
  | { code: 'fields'; missing: Field[] }
  | { code: 'label'; labels: string[] }
  | { code: 'pull-request'; pullRequests: number[] }
  | { code: 'xl' }

function openNumbers(issueRefs: IssueRef[]) {
  return issueRefs.filter(ref => ref.open).map(ref => ref.number)
}

export function startGate(issue: IssueSnapshot) {
  const blocks: StartBlock[] = []
  if (!issue.open) blocks.push({ code: 'closed' })
  const holds = issue.labels.filter(isHoldLabel)
  if (holds.length > 0) blocks.push({ code: 'label', labels: holds })
  const blockers = openNumbers(issue.blockedBy)
  if (blockers.length > 0) blocks.push({ code: 'blocked', issues: blockers })
  const children = openNumbers(issue.subIssues)
  if (children.length > 0) blocks.push({ code: 'container', issues: children })
  if (issue.linkedBranches.length > 0) {
    blocks.push({ code: 'branch', branches: issue.linkedBranches })
  }
  const pullRequests = openNumbers(issue.closingPullRequests)
  if (pullRequests.length > 0) blocks.push({ code: 'pull-request', pullRequests })
  const missing = (['effort', 'priority'] as const).filter(field => issue[field] === undefined)
  if (missing.length > 0) blocks.push({ code: 'fields', missing })
  if (issue.effort === 'XL') blocks.push({ code: 'xl' })
  return blocks
}

export function dispatchLabels(blocks: StartBlock[]) {
  const blockCodes = new Set(blocks.map(block => block.code))
  if (blockCodes.has('container')) return []
  if (blockCodes.has('fields')) return [labels.needsTriage]
  if (blockCodes.has('xl')) return [labels.needsSpec]
  return []
}

export interface LinkedIssue {
  blockedBy: IssueRef[]
  labels: string[]
  number: number
}

export interface PullRequestSnapshot {
  closes: LinkedIssue[]
  labels: string[]
}

export type MergeBlock =
  | { code: 'issue-blocked'; blockers: number[]; issue: number }
  | { code: 'issue-label'; issue: number; labels: string[] }
  | { code: 'pull-request-label'; labels: string[] }

const pullRequestHolds = [labels.needsReview, labels.doNotMerge]

export function mergeGate(pullRequest: PullRequestSnapshot) {
  const blocks: MergeBlock[] = []
  const holds = pullRequest.labels.filter(name =>
    pullRequestHolds.some(hold => sameLabel(name, hold)),
  )
  if (holds.length > 0) blocks.push({ code: 'pull-request-label', labels: holds })
  for (const issue of pullRequest.closes) {
    const issueHolds = issue.labels.filter(isHoldLabel)
    if (issueHolds.length > 0) {
      blocks.push({ code: 'issue-label', issue: issue.number, labels: issueHolds })
    }
    const blockers = openNumbers(issue.blockedBy)
    if (blockers.length > 0) blocks.push({ blockers, code: 'issue-blocked', issue: issue.number })
  }
  return blocks
}

function refs(numbers: number[]) {
  return numbers.map(number => `#${number}`).join(', ')
}

function codes(names: string[]) {
  return names.map(name => `\`${name}\``).join(', ')
}
const fieldNames = { effort: 'Effort', priority: 'Priority' } as const satisfies Record<
  Field,
  string
>

export function describeStartBlock(block: StartBlock) {
  switch (block.code) {
    case 'blocked': {
      return `Open blockers: ${refs(block.issues)}.`
    }
    case 'branch': {
      return `The issue has a linked branch: ${codes(block.branches)}.`
    }
    case 'closed': {
      return 'The issue is closed.'
    }
    case 'container': {
      return `The issue has open sub-issues: ${refs(block.issues)}.`
    }
    case 'fields': {
      return `The issue has no value for: ${block.missing.map(field => fieldNames[field]).join(', ')}.`
    }
    case 'label': {
      return `The issue has a label that stops agents: ${codes(block.labels)}.`
    }
    case 'pull-request': {
      return `An open pull request closes the issue: ${refs(block.pullRequests)}.`
    }
    case 'xl': {
      return 'The Effort is XL. The architect must split the issue first.'
    }
    default: {
      const unknown: never = block
      throw new Error(`Unknown start block: ${JSON.stringify(unknown)}`)
    }
  }
}

export function describeMergeBlock(block: MergeBlock) {
  switch (block.code) {
    case 'issue-blocked': {
      return `#${block.issue} has open blockers: ${refs(block.blockers)}.`
    }
    case 'issue-label': {
      return `#${block.issue} has a label that stops the merge: ${codes(block.labels)}.`
    }
    case 'pull-request-label': {
      return `The pull request has a label that stops the merge: ${codes(block.labels)}.`
    }
    default: {
      const unknown: never = block
      throw new Error(`Unknown merge block: ${JSON.stringify(unknown)}`)
    }
  }
}
