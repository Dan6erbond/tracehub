import { cp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const source = path.join(
  path.dirname(require.resolve('playwright-core/package.json')),
  'lib/vite/traceViewer',
)
const destination = path.join(import.meta.dirname, '..', 'public', 'trace')

await rm(destination, { recursive: true, force: true })
await cp(source, destination, { recursive: true })
