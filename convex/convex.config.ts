import { defineApp } from 'convex/server'
import { v } from 'convex/values'
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

export default app
