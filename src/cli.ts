#!/usr/bin/env node

import process from 'node:process'

import { run } from './commands/index.ts'

process.exitCode = run(process.argv.slice(2), {
  stderr: text => process.stderr.write(text),
  stdout: text => process.stdout.write(text),
})
