import { parseArgs } from 'node:util'

import pkg from '../../package.json' with { type: 'json' }

export interface Io {
  stderr: (text: string) => void
  stdout: (text: string) => void
}

const help = `Usage: agentic-repo [options]

Automate the issue and pull request lifecycle with any coding agent, locally or in CI.

Options:
  -h, --help     Show this help
  -v, --version  Show the version
`

const hint = 'Run "agentic-repo --help" for the usage.\n'

function parse(argv: string[]) {
  return parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      help: { short: 'h', type: 'boolean' },
      version: { short: 'v', type: 'boolean' },
    },
  })
}

export function run(argv: string[], io: Io) {
  let parsed: ReturnType<typeof parse>
  try {
    parsed = parse(argv)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    io.stderr(`${message}\n${hint}`)
    return 1
  }
  if (parsed.values.version) {
    io.stdout(`${pkg.version}\n`)
    return 0
  }
  const [command] = parsed.positionals
  if (command !== undefined) {
    io.stderr(`Unknown command "${command}".\n${hint}`)
    return 1
  }
  io.stdout(help)
  return 0
}
