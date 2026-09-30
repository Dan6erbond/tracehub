import { createAuth } from '../auth'

// Static instance so the Better Auth CLI can generate the schema
export const auth = createAuth({} as never)
