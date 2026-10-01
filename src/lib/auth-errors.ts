/** Where Better Auth sends users back to when an OAuth sign-in (`/login`) or link (`/me`) fails, with the reason in `?error=`. */
export const loginPath = '/login'
export const profilePath = '/me'

const authErrorMessages: Record<string, string> = {
  access_denied: 'The Git host denied the authorization.',
  invalid_code:
    'The Git host rejected the sign-in. Check the provider’s client ID and secret.',
  state_mismatch: 'The sign-in expired or was started elsewhere. Try again.',
  state_not_found: 'The sign-in expired or was started elsewhere. Try again.',
  state_invalid: 'The sign-in expired or was started elsewhere. Try again.',
  invalid_callback_request: 'The Git host sent an invalid response.',
  no_code: 'The Git host did not authorize the sign-in.',
  email_not_verified:
    'The Git host reports your email address as unverified. Verify it there, then try again.',
  email_not_found:
    'The Git host did not share an email address. Make one visible or verified on your account there.',
  registration_is_disabled:
    'Registration is closed. Ask an admin for an account.',
  signup_disabled: 'Signing up with this provider is not allowed.',
  account_not_linked:
    'An account with this email already exists. Sign in to it first, then connect this provider on your profile page.',
  unable_to_link_account:
    'This account could not be linked. Only providers trusted for linking can be connected to an existing account.',
  account_already_linked_to_different_user:
    'This account is already linked to another user.',
  unable_to_create_user: 'The account could not be created.',
  unable_to_get_user_info: 'The Git host did not return your profile.',
  oauth_provider_not_found: 'This provider is not available (any more).',
}

export const authErrorMessage = (code: string) =>
  authErrorMessages[code.toLowerCase()] ?? `Sign-in failed (${code}).`
