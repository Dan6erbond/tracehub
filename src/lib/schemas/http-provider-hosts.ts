type EnvSource = Record<string, string | undefined>

/**
 * Hosts besides the local ones that may be reached over plain http, from a comma-separated list.
 * It is `HTTP_PROVIDER_HOSTS` in Convex and `VITE_HTTP_PROVIDER_HOSTS` in the browser and the app server; neither runtime has the other's variable.
 */
export const httpProviderHosts = (): ReadonlySet<string> => {
  const list =
    (globalThis as { process?: { env: EnvSource } }).process?.env
      .HTTP_PROVIDER_HOSTS ??
    (import.meta as { env?: EnvSource }).env?.VITE_HTTP_PROVIDER_HOSTS
  return new Set(
    (list ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  )
}
