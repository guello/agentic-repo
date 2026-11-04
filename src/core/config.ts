import { parse as parseYaml } from 'yaml'
import * as z from 'zod'

import { efforts, issueTypes, priorities } from './fields.ts'

export const engineNames = ['claude', 'codex', 'gemini'] as const
export const tiers = ['deep', 'fast', 'standard'] as const
export const cells = [...tiers, 'split'] as const
export const modelEfforts = ['high', 'low', 'medium'] as const
export const fixedRoles = ['architect', 'reviewer', 'triage'] as const
export const fieldKeys = ['effort', 'priority', 'type'] as const

export type Engine = (typeof engineNames)[number]
export type Tier = (typeof tiers)[number]
export type Cell = (typeof cells)[number]
export type ModelEffort = (typeof modelEfforts)[number]
export type FixedRole = (typeof fixedRoles)[number]
export type FieldKey = (typeof fieldKeys)[number]

const engine = z.enum(engineNames)
const tier = z.enum(tiers)
const count = z.int().min(1)
const priorityCells = z.record(z.enum(priorities), z.enum(cells))
const modelChoice = z.strictObject({ effort: z.enum(modelEfforts), model: z.string().min(1) })
const tierModels = z.record(tier, modelChoice)

const field = <Values extends readonly [string, ...string[]]>(values: Values) =>
  z.strictObject({
    name: z
      .string()
      .min(1)
      .describe('The name of the field on GitHub. An issue type needs no name.'),
    options: z
      .partialRecord(z.enum(values), z.string().min(1))
      .optional()
      .describe('The GitHub option name of each value, when it is not the same.'),
    source: z
      .enum(['issue', 'project'])
      .optional()
      .describe(
        'Where the value is. The default is issue for the org backend and project for the user backend.'
      ),
  })

const routingSchema = z.strictObject({
  matrix: z
    .record(z.enum(efforts), priorityCells)
    .describe('The tier of each Effort and Priority. split sends the issue to the architect.'),
  models: z
    .record(engine, tierModels)
    .describe('The model and the effort of each engine and tier.'),
  roles: z
    .record(z.enum(fixedRoles), tier)
    .describe('The tier of each role that does not use the matrix.'),
})

export const configSchema = z
  .strictObject({
    backend: z
      .enum(['org', 'user'])
      .describe(
        'org uses issue types and issue fields. user uses project fields on a personal account.'
      ),
    engines: z.strictObject({
      default: engine.describe('The engine of each role.'),
      reviewer: engine
        .optional()
        .describe('The engine of the reviewer, when it is not the default engine.'),
    }),
    fields: z.strictObject({
      effort: field(efforts),
      priority: field(priorities),
      type: field(issueTypes),
    }),
    project: z
      .strictObject({ number: count, owner: z.string().min(1) })
      .describe('The project that holds the Status field.'),
    reconcile: z.strictObject({
      remindAfterDays: count.describe(
        'Days between two reminders on an issue that waits on the user.'
      ),
    }),
    review: z.strictObject({
      maxRounds: count.describe('Review rounds before the reviewer asks the user.'),
    }),
    routing: routingSchema,
  })
  .superRefine((config, context) => {
    if (config.backend !== 'user') return
    for (const key of fieldKeys) {
      if (config.fields[key].source !== 'issue') continue
      context.addIssue({
        code: 'custom',
        message: 'Personal accounts have no issue types or issue fields. Use the source project.',
        path: ['fields', key, 'source'],
      })
    }
  })

export type Config = z.infer<typeof configSchema>
export type Routing = Config['routing']

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

export type LayerConfig = DeepPartial<Config> & { root?: boolean }

const withMeta = (from: z.ZodType, to: z.ZodType): z.ZodType => {
  const meta = from.meta()
  return meta ? to.meta(meta) : to
}

const leafTypes = new Set(['boolean', 'enum', 'number', 'string'])

const partialOf = (schema: z.ZodType): z.ZodType => {
  if (schema instanceof z.ZodOptional) {
    return withMeta(schema, partialOf(schema.unwrap() as z.ZodType))
  }
  if (schema instanceof z.ZodObject) {
    return withMeta(schema, z.strictObject(partialShape(schema.shape)))
  }
  if (schema instanceof z.ZodRecord) {
    return withMeta(
      schema,
      z.partialRecord(schema.keyType, partialOf(schema.valueType as z.ZodType))
    )
  }
  if (leafTypes.has(schema.def.type)) return schema
  throw new Error(`The layer schema cannot make a partial ${schema.def.type} schema.`)
}

const partialShape = (shape: z.ZodRawShape): z.ZodRawShape =>
  Object.fromEntries(
    Object.entries(shape).map(([key, value]) => [key, partialOf(value as z.ZodType).optional()])
  )

export const layerSchema = z
  .strictObject({
    ...partialShape(configSchema.shape),
    root: z.boolean().optional().describe('In a repo file, true skips the owner file.'),
  })
  .meta({
    description:
      'The config of agentic-repo: package defaults, then the owner file, then the repo file.',
    title: 'agentic-repo config',
  })

export const configJsonSchema = (): Record<string, unknown> =>
  z.toJSONSchema(layerSchema, { target: 'draft-07' })

export type Result<T> = { error: string; ok: false } | { ok: true; value: T }

export interface Layer {
  data: LayerConfig
  source: string
}

export const parseLayer = (text: string, source: string): Result<Layer> => {
  let data: unknown
  try {
    data = parseYaml(text, { logLevel: 'error', prettyErrors: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { error: `${source}: ${message}`, ok: false }
  }
  const parsed = layerSchema.safeParse(data ?? {})
  if (!parsed.success) return { error: `${source}:\n${z.prettifyError(parsed.error)}`, ok: false }
  return { ok: true, value: { data: parsed.data, source } }
}

type Plain = Record<string, unknown>

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const merge = (base: unknown, layer: unknown): unknown => {
  if (layer === undefined) return base
  if (!isPlain(base) || !isPlain(layer)) return layer
  const keys = new Set([...Object.keys(base), ...Object.keys(layer)])
  return Object.fromEntries([...keys].map(key => [key, merge(base[key], layer[key])]))
}

const leaves = (value: unknown, path: string[] = []): string[][] =>
  isPlain(value) && Object.keys(value).length > 0
    ? Object.entries(value).flatMap(([key, child]) => leaves(child, [...path, key]))
    : [path]

const valueAt = (value: unknown, path: string[]): unknown =>
  path.reduce<unknown>((node, key) => (isPlain(node) ? node[key] : undefined), value)

export interface Resolved {
  config: Config
  sources: Map<string, string>
}

export const resolveConfig = (defaults: Layer, owner?: Layer, repo?: Layer): Result<Resolved> => {
  const misplaced = [defaults, owner].find(layer => layer?.data.root !== undefined)
  if (misplaced) {
    return { error: `${misplaced.source}: root applies only to a repo file.`, ok: false }
  }
  const layers = [defaults, repo?.data.root === true ? undefined : owner, repo].filter(
    (layer): layer is Layer => layer !== undefined
  )
  const merged = layers.reduce<unknown>((result, layer) => {
    const { root, ...data } = layer.data
    return merge(result, data)
  }, {})
  const parsed = configSchema.safeParse(merged)
  if (!parsed.success) return { error: z.prettifyError(parsed.error), ok: false }
  const sourceOf = (path: string[]): string =>
    layers.findLast(layer => valueAt(layer.data, path) !== undefined)?.source ?? defaults.source
  const sources = new Map(leaves(parsed.data).map(path => [path.join('.'), sourceOf(path)]))
  return { ok: true, value: { config: parsed.data, sources } }
}

export const fieldSource = (config: Config, key: FieldKey): 'issue' | 'project' =>
  config.fields[key].source ?? (config.backend === 'org' ? 'issue' : 'project')
