import { createContext, useContext } from 'react'
import type { Doc } from '../../convex/_generated/dataModel'

const RepoContext = createContext<Doc<'repos'> | null>(null)

/** Provides the repo that the `/repos/$repoId` layout has already loaded to its child routes. */
export const RepoProvider = RepoContext

export function useCurrentRepo() {
  const repo = useContext(RepoContext)
  if (!repo) throw new Error('useCurrentRepo needs a RepoProvider')
  return repo
}
