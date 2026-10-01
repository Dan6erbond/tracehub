// Jobs are synced for the most recently active heads only, so a repo with thousands of branches keeps a bounded reload.
export const MAX_HEADS_PER_SOURCE = 100
