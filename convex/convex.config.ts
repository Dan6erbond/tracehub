import { defineApp } from 'convex/server'
import { v } from 'convex/values'
import aggregate from '@convex-dev/aggregate/convex.config.js'
import migrations from '@convex-dev/migrations/convex.config.js'
import betterAuth from './betterAuth/convex.config'

const app = defineApp({
  env: {
    SITE_URL: v.string(),
    BETTER_AUTH_SECRET: v.string(),
    GITHUB_CLIENT_ID: v.string(),
    GITHUB_CLIENT_SECRET: v.string(),
  },
})
app.use(betterAuth)
app.use(migrations)
app.use(aggregate, { name: 'tracesByRun' })
app.use(aggregate, { name: 'tracesByBranch' })
app.use(aggregate, { name: 'tracesByPull' })
app.use(aggregate, { name: 'tracesByPipeline' })
app.use(aggregate, { name: 'runsByJob' })

export default app
