import { createGithubAdapter } from './github'
import type { GitProviderType } from '../../../src/lib/schemas/git-provider'
import type { CreateAdapter } from './types'

const adapterFactories: Record<GitProviderType, CreateAdapter> = {
  github: createGithubAdapter,
}

export const createAdapter: CreateAdapter = (provider) =>
  adapterFactories[provider.type](provider)
