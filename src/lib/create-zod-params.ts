import type { z } from 'zod'

/**
 * Creates a route `params` definition with a Zod schema parser and stringifier.
 * If validation fails, returns `false` which TanStack Router treats as an unmatched
 * route and falls through to the not-found boundary.
 */
export function createZodParams<TSchema extends z.ZodType>(schema: TSchema) {
  type Parsed = z.infer<TSchema>
  return {
    parse: (raw: Record<string, unknown>): Parsed | false => {
      const result = schema.safeParse(raw)
      return result.success ? result.data : false
    },
    // TanStack Router expects stringify to return every parsed param as a string.
    stringify: (params: Parsed): { [K in keyof Parsed]: string } => {
      const result: Record<string, string> = {}
      for (const [key, value] of Object.entries(
        params as Record<string, unknown>,
      )) {
        if (value !== undefined && value !== null) {
          result[key] = String(value)
        }
      }
      return result as { [K in keyof Parsed]: string }
    },
  }
}
