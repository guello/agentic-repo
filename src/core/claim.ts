export type ClaimDecision =
  | { action: 'keep' }
  | { action: 'missing' }
  | { action: 'yield'; holder: string }

export const resolveClaim = (linkedBranches: string[], mine: string): ClaimDecision => {
  if (!linkedBranches.includes(mine)) return { action: 'missing' }
  const [holder] = linkedBranches
  if (holder === undefined || holder === mine) return { action: 'keep' }
  return { action: 'yield', holder }
}

export const closingLine = (issues: number[]): string =>
  issues.map((issue, index) => `${index === 0 ? 'Closes' : 'closes'} #${issue}`).join(', ')
