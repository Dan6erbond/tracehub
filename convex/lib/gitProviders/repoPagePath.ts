import { webPathSchema } from '../../../src/lib/schemas/url'
import type { RepoRef } from './types'

export const parseUrl = (value: string, base?: string) => {
  try {
    return new URL(value, base)
  } catch {
    return undefined
  }
}

/** A page of the repo as the host links it, as the path relative to the repo's URL; `undefined` for any other page. */
export const repoPagePath = (url: URL, { owner, name }: RepoRef) => {
  const marker = `/${owner}/${name}/`
  const start = url.pathname.indexOf(marker)
  if (start < 0) return undefined
  return webPathSchema.safeParse(url.pathname.slice(start + marker.length)).data
}

/** The page path of an absolute URL the host reported for a page of the repo. */
export const reportedPagePath = (
  href: string | null | undefined,
  repo: RepoRef,
) => {
  const url = href ? parseUrl(href) : undefined
  return url && repoPagePath(url, repo)
}
