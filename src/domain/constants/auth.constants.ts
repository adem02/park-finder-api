/** Lifetime of a refresh token. Each rotation issues a new token with a fresh lifetime. */
export const REFRESH_TOKEN_TTL_DAYS = 30;

/**
 * A token rotated less than this long ago may be replayed without it being treated as theft:
 * two tabs refreshing at the same time, or a response lost on a flaky network.
 * The replay is still rejected, but the session family is not revoked.
 */
export const REFRESH_TOKEN_REUSE_GRACE_SECONDS = 10;
