import { z } from 'zod'
import { withSystemFields } from 'convex-helpers/server/zod4'
import { httpUrlSchema } from './url'

export const gitProviderTypeSchema = z.enum(['github', 'gitea', 'forgejo'])
export type GitProviderType = z.infer<typeof gitProviderTypeSchema>

export const gitProviderTypeLabels: Record<GitProviderType, string> = {
  github: 'GitHub',
  gitea: 'Gitea',
  forgejo: 'Forgejo',
}

// Better Auth stores email-and-password logins as accounts with this provider id.
const RESERVED_SLUGS = new Set(['credential'])

/** The slug is the Better Auth `providerId` of the accounts linked to the provider, so it never changes. */
export const providerSlugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{1,31}$/, {
    error:
      'Use 2 to 32 lowercase letters, digits or dashes, starting with a letter or digit',
  })
  .refine((slug) => !RESERVED_SLUGS.has(slug), {
    error: 'This slug is reserved',
  })

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

const isProviderUrl = (value: string) => {
  const url = new URL(value)
  return (
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    (url.protocol === 'https:' || LOCAL_HOSTS.has(url.hostname))
  )
}

/** The address of a Git host or its API: https (http only for a local host), without credentials, query or fragment. */
export const providerUrlSchema = httpUrlSchema.refine(isProviderUrl, {
  error:
    'Use an https:// address without credentials, query or fragment (http:// only for localhost)',
})

/** A provider as stored; `clientSecret` is encrypted. */
export const gitProviderSchema = z.object({
  slug: providerSlugSchema,
  type: gitProviderTypeSchema,
  name: z.string().trim().min(1, 'Enter a name').max(64),
  baseUrl: providerUrlSchema,
  apiUrl: providerUrlSchema.optional(),
  clientId: z.string().trim().min(1, 'Enter the client ID'),
  enabled: z.boolean(),
  allowSignUp: z.boolean(),
  trustedForLinking: z.boolean(),
  clientSecret: z.string(),
})
export type StoredGitProvider = z.infer<typeof gitProviderSchema>

/** What the login page and `/me` need to offer a provider. */
export const gitProviderPublicSchema = gitProviderSchema.pick({
  slug: true,
  name: true,
  type: true,
  trustedForLinking: true,
})
export type GitProviderPublic = z.infer<typeof gitProviderPublicSchema>

/** A provider as admins see it: everything but the secret, which is only reported as set. */
export const gitProviderAdminSchema = gitProviderSchema
  .omit({ clientSecret: true })
  .extend(withSystemFields('gitProviders', { hasSecret: z.boolean() }))
export type GitProviderAdmin = z.infer<typeof gitProviderAdminSchema>

const optionalUrlSchema = z.union([z.literal(''), providerUrlSchema])

/** Forms hold an unset API URL as an empty string. */
export const createGitProviderSchema = gitProviderSchema.extend({
  apiUrl: optionalUrlSchema,
  clientSecret: z.string().trim().min(1, 'Enter the client secret'),
})
export type CreateGitProvider = z.infer<typeof createGitProviderSchema>

/**
 * The slug and type stay as created. An empty `clientSecret` keeps the stored one.
 * Pointing the provider at another address needs `confirmHostChange`: accounts and repos stay attached to it, so it must be the same instance moved, not a different server.
 */
export const updateGitProviderSchema = createGitProviderSchema
  .omit({ slug: true, type: true })
  .extend({
    clientSecret: z.string().trim(),
    confirmHostChange: z.boolean(),
  })
export type UpdateGitProvider = z.infer<typeof updateGitProviderSchema>

export type TemplateField = 'slug' | 'name' | 'baseUrl' | 'apiUrl'

export interface ProviderTemplate {
  key: string
  type: GitProviderType
  label: string
  description: string
  /** Initial values of the create form. */
  defaults: Pick<CreateGitProvider, TemplateField>
  /** Fields the admin enters; the rest keep their default. */
  editable: ReadonlyArray<TemplateField>
}

export const providerTemplates: ReadonlyArray<ProviderTemplate> = [
  {
    key: 'github',
    type: 'github',
    label: 'GitHub',
    description: 'github.com',
    defaults: {
      slug: 'github',
      name: 'GitHub',
      baseUrl: 'https://github.com',
      apiUrl: '',
    },
    editable: [],
  },
  {
    key: 'github-enterprise',
    type: 'github',
    label: 'GitHub Enterprise Server',
    description: 'A self-hosted GitHub',
    defaults: {
      slug: 'github-enterprise',
      name: 'GitHub Enterprise',
      baseUrl: '',
      apiUrl: '',
    },
    editable: ['slug', 'name', 'baseUrl', 'apiUrl'],
  },
  {
    key: 'gitea',
    type: 'gitea',
    label: 'Gitea',
    description: 'A self-hosted Gitea',
    defaults: {
      slug: 'gitea',
      name: 'Gitea',
      baseUrl: '',
      apiUrl: '',
    },
    editable: ['slug', 'name', 'baseUrl', 'apiUrl'],
  },
  {
    key: 'forgejo',
    type: 'forgejo',
    label: 'Forgejo',
    description: 'A self-hosted Forgejo, or Codeberg',
    defaults: {
      slug: 'forgejo',
      name: 'Forgejo',
      baseUrl: '',
      apiUrl: '',
    },
    editable: ['slug', 'name', 'baseUrl', 'apiUrl'],
  },
]

export const findProviderTemplate = (
  key: string,
): ProviderTemplate | undefined =>
  providerTemplates.find((template) => template.key === key)

/** The pages of a Git host start at the base URL, so it is kept as origin and path without a trailing slash. */
export const normalizeBaseUrl = (url: string) => {
  const { origin, pathname } = new URL(url)
  return origin + pathname.replace(/\/+$/, '')
}

/** The fields of an existing provider the admin can change; the addresses of a provider created from a fixed template (github.com) stay as they are. */
export const editableFieldsOf = (
  baseUrl: string,
): ReadonlyArray<Exclude<TemplateField, 'slug'>> =>
  providerTemplates.some(
    (template) =>
      template.defaults.baseUrl === baseUrl &&
      !template.editable.includes('baseUrl'),
  )
    ? ['name']
    : ['name', 'baseUrl', 'apiUrl']
