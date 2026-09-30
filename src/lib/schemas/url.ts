import { z } from 'zod'

// Stored URLs end up in `href`s, so anything but http(s), such as `javascript:`, is rejected.
export const httpUrlSchema = z.url({
  protocol: /^https?$/,
  error: 'Enter a valid http(s) URL',
})

/** The value when it is an http(s) URL, for links a CI or host supplies that we render. */
export const toHttpUrl = (value?: string | null) =>
  value ? httpUrlSchema.safeParse(value).data : undefined
