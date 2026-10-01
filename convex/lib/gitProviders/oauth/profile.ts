import { z } from 'zod'
import { hostFetch } from '../hostFetch'

const hostEmailSchema = z.object({
  email: z.string(),
  primary: z.boolean().catch(false),
  verified: z.boolean().catch(false),
})
export const hostEmailsSchema = z.array(hostEmailSchema)
export type HostEmail = z.infer<typeof hostEmailSchema>

/** The parsed answer, or `null` (logged) when the host refuses the request or answers something else than `schema`. */
export const fetchJson = async <T extends z.ZodType>(
  url: string,
  accessToken: string,
  schema: T,
  accept?: string,
): Promise<z.output<T> | null> => {
  const response = await hostFetch(url, accessToken, accept)
  if (!response.ok) {
    console.warn(`GET ${url} answered ${response.status}`)
    return null
  }
  const parsed = schema.safeParse(await response.json())
  if (parsed.success) return parsed.data
  console.warn(
    `GET ${url} answered an unexpected body: ${z.prettifyError(parsed.error)}`,
  )
  return null
}

/** A link or sign-in on an unverified address would let anyone claim it, so a verified one is preferred over the public profile email. */
export const selectEmail = (
  emails: Array<HostEmail> | null,
  profileEmail?: string | null,
) => {
  const chosen =
    emails?.find((e) => e.primary && e.verified) ??
    emails?.find((e) => e.verified) ??
    emails?.find((e) => e.primary) ??
    emails?.[0]
  return {
    email: chosen?.email ?? (profileEmail || null),
    emailVerified: chosen?.verified ?? false,
  }
}
