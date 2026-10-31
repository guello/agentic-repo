import { parseArgs } from 'node:util'

import pkg from '../../package.json' with { type: 'json' }

export interface Io {
  stderr: (text: string) => void
  stdout: (text: string) => void
}

const help = `Usage: agentic-github [options]

Run software work through GitHub issues and pull requests, with any coding agent.

Options:
  -h, --help     Show this help
  -v, --version  Show the version
`

const hint = 'Run "agentic-github --help" for the usage.\n'

const parse = (argv: string[]) =>
  parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      help: { short: 'h', type: 'boolean' },
      version: { short: 'v', type: 'boolean' },
    },
  })

export const run = (argv: string[], io: Io): number => {
  let parsed: ReturnType<typeof parse>
  try {
    parsed = parse(argv)
  } catch (error: unknown) {
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
