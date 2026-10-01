/** A request to a Git host's API with the user's token; a redirect would carry the token along, so it is an error. */
export const hostFetch = (
  url: string | URL,
  accessToken: string,
  accept = 'application/json',
) =>
  fetch(url, {
    redirect: 'error',
    headers: {
      accept,
      authorization: `Bearer ${accessToken}`,
      'user-agent': 'tracehub',
    },
  })
