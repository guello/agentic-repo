import { type Effort, type Priority } from './fields.ts'
import { labels } from './labels.ts'

export type Engine = 'claude' | 'codex' | 'gemini'
export type Tier = 'deep' | 'fast' | 'standard'
export type Cell = Tier | 'split'
export type ModelEffort = 'high' | 'low' | 'medium'
export type Role = 'architect' | 'implementer' | 'reviewer' | 'triage'

export interface ModelChoice {
  effort: ModelEffort
  model: string
}

export interface Engines {
  default: Engine
  reviewer?: Engine
}

export interface Routing {
  matrix: Record<Effort, Record<Priority, Cell>>
  models: Record<Engine, Record<Tier, ModelChoice>>
  roles: Record<Exclude<Role, 'implementer'>, Tier>
}

export interface RouteConfig {
  engines: Engines
  routing: Routing
}

export interface RouteInput {
  effort?: Effort
  priority?: Priority
  role: Role
}

export type RouteResult =
  | { effort: ModelEffort; engine: Engine; model: string; review: boolean; run: true; tier: Tier }
  | { label: typeof labels.needsSpec | typeof labels.needsTriage; run: false }

const cellOf = (input: RouteInput, routing: Routing): Cell | undefined => {
  if (input.role !== 'implementer') return routing.roles[input.role]
  if (input.effort === undefined || input.priority === undefined) return undefined
  return routing.matrix[input.effort][input.priority]
}

export const route = (input: RouteInput, { engines, routing }: RouteConfig): RouteResult => {
  const cell = cellOf(input, routing)
  if (cell === undefined) return { label: labels.needsTriage, run: false }
  if (cell === 'split') return { label: labels.needsSpec, run: false }
  const engine = input.role === 'reviewer' ? (engines.reviewer ?? engines.default) : engines.default
  const { effort, model } = routing.models[engine][cell]
  return { effort, engine, model, review: input.role === 'implementer' && cell === 'deep', run: true, tier: cell }
}
