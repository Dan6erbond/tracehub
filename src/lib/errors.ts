import { ConvexError } from 'convex/values'

export const errorCodes = {
  forbidden: 'FORBIDDEN',
  hostChangeUnconfirmed: 'HOST_CHANGE_UNCONFIRMED',
  providerInUse: 'PROVIDER_IN_USE',
  providerNotFound: 'PROVIDER_NOT_FOUND',
  providerSlugTaken: 'PROVIDER_SLUG_TAKEN',
  providerUrlsLocked: 'PROVIDER_URLS_LOCKED',
  repoNotFound: 'REPO_NOT_FOUND',
  unauthenticated: 'UNAUTHENTICATED',
} as const

/** The `message` a backend `ConvexError({ code, message })` carries; the error's own message is its serialized data. */
export const getErrorMessage = (error: Error) =>
  error instanceof ConvexError &&
  typeof (error.data as { message?: unknown } | null)?.message === 'string'
    ? (error.data as { message: string }).message
    : error.message
