export const labels = {
  agent: 'agent',
  agentFailed: 'agent-failed',
  doNotMerge: 'do-not-merge',
  needsInfo: 'needs-info',
  needsReview: 'needs-review',
  needsSpec: 'needs-spec',
  needsTriage: 'needs-triage',
} as const

export const sameLabel = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

export const isHoldLabel = (name: string): boolean =>
  name.toLowerCase().startsWith('needs-') || sameLabel(name, labels.agentFailed)
