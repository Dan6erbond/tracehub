import { zid } from 'convex-helpers/server/zod4'
import { zInternalQuery } from './functions'

type RepoScopedTable = 'ciJobs' | 'ciPipelines' | 'runs' | 'traces'

/** Looks a document up by id, treating one of another repo as missing. */
export const findInRepoQuery = <TTable extends RepoScopedTable>(
  table: TTable,
) =>
  zInternalQuery({
    args: { repoId: zid('repos'), id: zid(table) },
    handler: async (ctx, { repoId, id }) => {
      const doc = await ctx.db.get(table, id)
      return doc?.repoId === repoId ? doc : null
    },
  })
