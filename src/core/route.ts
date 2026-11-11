import type { Cell, Config, Engine, FixedRole, ModelEffort, Routing, Tier } from './config.ts'
import type { Effort, Priority } from './fields.ts'
import { labels } from './labels.ts'

export type Role = FixedRole | 'implementer'

export type RouteConfig = Pick<Config, 'engines' | 'routing'>

export interface RouteInput {
  effort?: Effort
  priority?: Priority
  role: Role
}

export type RouteResult =
  | { effort: ModelEffort; engine: Engine; model: string; review: boolean; run: true; tier: Tier }
  | { label: typeof labels.needsSpec | typeof labels.needsTriage; run: false }

function cellOf(input: RouteInput, routing: Routing): Cell | undefined {
  if (input.role !== 'implementer') return routing.roles[input.role]
  if (input.effort === undefined || input.priority === undefined) return undefined
  return routing.matrix[input.effort][input.priority]
}

export function route(input: RouteInput, { engines, routing }: RouteConfig) {
  const cell = cellOf(input, routing)
  if (cell === undefined) return { label: labels.needsTriage, run: false }
  if (cell === 'split') return { label: labels.needsSpec, run: false }
  const engine = input.role === 'reviewer' ? (engines.reviewer ?? engines.default) : engines.default
  const { effort, model } = routing.models[engine][cell]
  return {
    effort,
    engine,
    model,
    review: input.role === 'implementer' && cell === 'deep',
    run: true,
    tier: cell,
  }
}
