export const labels = {
  agent: 'agent',
  agentFailed: 'agent-failed',
  doNotMerge: 'do-not-merge',
  needsInfo: 'needs-info',
  needsReview: 'needs-review',
  needsSpec: 'needs-spec',
  needsTriage: 'needs-triage',
} as const

export function sameLabel(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase()
}

export function isHoldLabel(name: string) {
  return name.toLowerCase().startsWith('needs-') || sameLabel(name, labels.agentFailed)
}
