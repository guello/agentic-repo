export type ClaimDecision =
  | { action: 'keep' }
  | { action: 'missing' }
  | { action: 'yield'; holder: string }

export function resolveClaim(linkedBranches: string[], mine: string) {
  if (!linkedBranches.includes(mine)) return { action: 'missing' }
  const [holder] = linkedBranches
  if (holder === undefined || holder === mine) return { action: 'keep' }
  return { action: 'yield', holder }
}

export function closingLine(issues: number[]) {
  return issues.map((issue, index) => `${index === 0 ? 'Closes' : 'closes'} #${issue}`).join(', ')
}
