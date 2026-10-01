import path from 'node:path'

export const projectRoot = path.resolve(import.meta.dirname, '../..')

export const nodeModuleBin = (relativePath: string) =>
  path.join(projectRoot, 'node_modules', relativePath)
