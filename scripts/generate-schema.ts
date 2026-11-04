import { writeFile } from 'node:fs/promises'

import { configJsonSchema } from '../src/core/config.ts'

const target = new URL('../schema.json', import.meta.url)
await writeFile(target, `${JSON.stringify(configJsonSchema(), undefined, 2)}\n`)
