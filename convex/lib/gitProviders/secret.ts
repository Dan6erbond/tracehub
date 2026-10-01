import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto'
import { env } from '../../_generated/server'

/** Client secrets are stored encrypted with a key derived from `BETTER_AUTH_SECRET`; rotating that secret makes stored ones unreadable. */
export const encryptSecret = (secret: string) =>
  symmetricEncrypt({ key: env.BETTER_AUTH_SECRET, data: secret })

export const decryptSecret = (encrypted: string) =>
  symmetricDecrypt({ key: env.BETTER_AUTH_SECRET, data: encrypted })

/** Whether a stored secret is set and still decrypts with the current `BETTER_AUTH_SECRET`. */
export const isReadableSecret = async (encrypted: string) => {
  if (encrypted === '') return false
  try {
    return (await decryptSecret(encrypted)) !== ''
  } catch {
    return false
  }
}
