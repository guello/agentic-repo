import type { Config, Layer } from './config.ts'

export const defaults = {
  engines: {
    default: 'claude',
  },
  fields: {
    effort: { name: 'Effort' },
    priority: { name: 'Priority' },
    type: { name: 'Kind' },
  },
  reconcile: {
    remindAfterDays: 7,
  },
  review: {
    maxRounds: 2,
  },
  routing: {
    matrix: {
      L: { P0: 'deep', P1: 'deep', P2: 'deep', P3: 'deep' },
      M: { P0: 'deep', P1: 'standard', P2: 'standard', P3: 'standard' },
      S: { P0: 'standard', P1: 'fast', P2: 'fast', P3: 'fast' },
      XL: { P0: 'split', P1: 'split', P2: 'split', P3: 'split' },
      XS: { P0: 'fast', P1: 'fast', P2: 'fast', P3: 'fast' },
    },
    models: {
      claude: {
        deep: { effort: 'high', model: 'opus' },
        fast: { effort: 'low', model: 'haiku' },
        standard: { effort: 'medium', model: 'sonnet' },
      },
      codex: {
        deep: { effort: 'high', model: 'gpt-6-astra' },
        fast: { effort: 'low', model: 'gpt-6-luna' },
        standard: { effort: 'medium', model: 'gpt-6.1-sol' },
      },
      gemini: {
        deep: { effort: 'high', model: 'gemini-4-argon' },
        fast: { effort: 'low', model: 'gemini-3.6-flash' },
        standard: { effort: 'medium', model: 'gemini-4-argon' },
      },
    },
    roles: {
      architect: 'deep',
      reviewer: 'deep',
      triage: 'fast',
    },
  },
} satisfies Omit<Config, 'backend' | 'project'>

export const defaultsLayer: Layer = { data: defaults, source: 'package defaults' }
