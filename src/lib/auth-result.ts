type AuthResult = {
  data: unknown
  error: { message?: string; statusText: string } | null
}

/** Better Auth client calls resolve to `{ data, error }`; this turns the error into a throw so they fit `useMutation` and `useQuery`. */
export async function unwrapAuth<TResult extends AuthResult>(
  result: Promise<TResult>,
) {
  const { data, error } = await result
  if (error) throw new Error(error.message || error.statusText)
  return data as Extract<TResult, { error: null }>['data']
}
