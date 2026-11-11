export const commitTypes = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
] as const

export type CommitType = (typeof commitTypes)[number]

const typeMap = new Map<string, CommitType>([
  ['bug', 'fix'],
  ['feature', 'feat'],
  ['task', 'chore'],
])

export function commitTypeFor(issueType: string | undefined): CommitType | undefined {
  return issueType === undefined ? undefined : typeMap.get(issueType.toLowerCase())
}

export const maxSlugLength = 40

const letters: Record<string, string> = {
  æ: 'ae',
  ð: 'd',
  đ: 'd',
  ı: 'i',
  ł: 'l',
  ø: 'o',
  œ: 'oe',
  ß: 'ss',
  þ: 'th',
}

export function slug(title: string) {
  const full = title
    .normalize('NFKD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[æðđıłøœßþ]/g, letter => letters[letter] ?? letter)
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
  if (full.length <= maxSlugLength) return full
  const cut = full.slice(0, maxSlugLength)
  const atWord = full[maxSlugLength] === '-' ? cut : cut.slice(0, Math.max(cut.lastIndexOf('-'), 0))
  return (atWord || cut).replace(/-+$/, '')
}

export interface BranchInput {
  ci: boolean
  issue: number
  title: string
  type: CommitType
}

export function branchName({ ci, issue, title, type }: BranchInput) {
  const words = slug(title)
  const name = `${type}/${issue}${words ? `-${words}` : ''}`
  return ci ? `agent/${name}` : name
}
