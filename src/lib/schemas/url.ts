import { z } from 'zod'

// Stored URLs end up in `href`s, so anything but http(s), such as `javascript:`, is rejected.
export const httpUrlSchema = z.url({
  protocol: /^https?$/,
  error: 'Enter a valid http(s) URL',
})

/** The value when it is an http(s) URL, for links a CI or host supplies that we render. */
export const toHttpUrl = (value?: string | null) =>
  value ? httpUrlSchema.safeParse(value).data : undefined

// One path segment of RFC 3986: unreserved, sub-delims, `:` and `@`, or a percent-encoded byte.
const PATH_SEGMENT = /^(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+$/

const isSafeSegment = (segment: string) => {
  try {
    const decoded = decodeURIComponent(segment)
    return decoded !== '.' && decoded !== '..' && !/[/\\]/.test(decoded)
  } catch {
    return false
  }
}

/** A page of the Git host relative to the repo's URL, e.g. `actions/runs/42/jobs/1`; it is prefixed with the host's current base URL when read, so it survives a hostname change. */
export const webPathSchema = z
  .string()
  .max(512)
  .refine(
    (path) =>
      path
        .split('/')
        .every(
          (segment) => PATH_SEGMENT.test(segment) && isSafeSegment(segment),
        ),
    { error: 'Enter a path relative to the repository' },
  )
