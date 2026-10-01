import { formatScopes } from './provider-scopes'
import type { GitProviderType } from './schemas/git-provider'

export interface GuideStep {
  text: string
  /** A page of the host's web UI, `path` relative to the provider's base URL. */
  link?: { label: string; path: string }
}

export interface GuideVariant {
  key: string
  title: string
  steps: ReadonlyArray<GuideStep>
  notes?: ReadonlyArray<string>
}

export interface SetupGuide {
  /** The first variant is the recommended one. */
  variants: ReadonlyArray<GuideVariant>
}

const REGRANT_NOTE =
  'A grant keeps the scopes it was made with. When TraceHub requests different ones, users must revoke the application in their host settings and sign in again.'

const TRUST_NOTE =
  'Only trust this host for linking when it confirms email addresses: set [service] REGISTER_EMAIL_CONFIRM = true in its app.ini.'

/** How to register the OAuth application on the host, per provider type; the callback URL is shown next to it. */
export const setupGuides: Record<GitProviderType, SetupGuide> = {
  github: {
    variants: [
      {
        key: 'oauth-app',
        title: 'OAuth App (recommended)',
        steps: [
          {
            text: 'Open Settings → Developer settings → OAuth Apps and choose New OAuth App.',
            link: {
              label: 'New OAuth App',
              path: '/settings/applications/new',
            },
          },
          {
            text: 'Set the homepage URL to the address of this TraceHub site.',
          },
          {
            text: 'Set the authorization callback URL to the callback URL above.',
          },
          { text: 'Register the application and generate a client secret.' },
          {
            text: `Enter the client ID and the client secret below. TraceHub requests the scopes ${formatScopes('github')} itself.`,
          },
        ],
      },
      {
        key: 'github-app',
        title: 'GitHub App',
        steps: [
          {
            text: 'Open Settings → Developer settings → GitHub Apps and choose New GitHub App.',
            link: { label: 'New GitHub App', path: '/settings/apps/new' },
          },
          {
            text: 'Set the homepage URL to the address of this TraceHub site.',
          },
          {
            text: 'Set the callback URL to the callback URL above and leave "Request user authorization (OAuth) during installation" off.',
          },
          {
            text: 'The expiry of user authorization tokens may stay on; TraceHub refreshes them.',
          },
          { text: 'Turn off Webhook → Active, which this setup does not use.' },
          {
            text: 'Grant read access to Account → Email addresses and to Repository → Metadata, Contents, Pull requests, Actions, Commit statuses and Checks.',
          },
          { text: 'Create the app and generate a client secret.' },
          {
            text: 'Enter the client ID (it starts with Iv) and the client secret below.',
          },
        ],
        notes: [
          'A GitHub App only sees the repositories of accounts and organizations where it is installed, so install it wherever TraceHub should list repositories.',
        ],
      },
    ],
  },
  gitea: {
    variants: [
      {
        key: 'oauth2-application',
        title: 'OAuth2 application',
        steps: [
          {
            text: 'Open User settings → Applications → Manage OAuth2 Applications. To register it instance-wide, use Site administration → Integrations → Applications instead.',
            link: {
              label: 'Your applications',
              path: '/user/settings/applications',
            },
          },
          { text: 'Enter an application name.' },
          {
            text: 'Set the redirect URI to the callback URL above and keep "Confidential Client" checked.',
          },
          {
            text: 'Create the application and copy the client secret, which is only shown once.',
          },
          {
            text: `Enter the client ID and the client secret below. TraceHub requests the scopes ${formatScopes('gitea')} itself.`,
          },
        ],
        notes: [
          'Gitea before version 1.23 ignores scopes, so the access token then has the full rights of the user.',
          REGRANT_NOTE,
          TRUST_NOTE,
        ],
      },
    ],
  },
  forgejo: {
    variants: [
      {
        key: 'oauth2-application',
        title: 'OAuth2 application',
        steps: [
          {
            text: 'Open User settings → Applications → Manage OAuth2 applications. To register it instance-wide, use Site administration → Integrations → Applications instead.',
            link: {
              label: 'Your applications',
              path: '/user/settings/applications',
            },
          },
          { text: 'Enter an application name.' },
          {
            text: 'Set the redirect URI to the callback URL above and keep "Confidential client" checked.',
          },
          {
            text: 'Create the application and copy the client secret, which is only shown once.',
          },
          {
            text: `Enter the client ID and the client secret below. TraceHub requests the scopes ${formatScopes('forgejo')} itself.`,
          },
        ],
        notes: [
          'Forgejo before version 9 ignores scopes, so the access token then has the full rights of the user.',
          REGRANT_NOTE,
          TRUST_NOTE,
        ],
      },
    ],
  },
}
