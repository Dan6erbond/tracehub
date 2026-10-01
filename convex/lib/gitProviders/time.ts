/** Hosts that report a time which has not happened yet send the epoch or nothing. */
export const toTime = (value?: string | null) => {
  const time = value ? Date.parse(value) : Number.NaN
  return time > 0 ? time : undefined
}

/** The first of the reported times that has happened, else now: a run that is still queued has none yet. */
export const firstTimeOrNow = (...values: Array<string | null | undefined>) =>
  values.map(toTime).find((time) => time !== undefined) ?? Date.now()
