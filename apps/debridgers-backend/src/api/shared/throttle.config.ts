/*
 * Per-endpoint throttle limits.
 *
 * The limits below are the production values. AUTH_THROTTLE_LIMIT overrides all
 * of them at once, which exists for the e2e suite: every spec authenticates
 * from the same IP inside one window, so a 5-per-minute login limit is spent
 * long before the last suite runs and the failures land on whichever test drew
 * the short straw rather than on anything real.
 *
 * Read at module load because @Throttle is evaluated when the controller class
 * is defined, so this cannot go through ConfigService.
 */
export function authThrottle(
  defaultLimit: number,
  ttl: number = 60000,
): { short: { ttl: number; limit: number } } {
  const override = process.env.AUTH_THROTTLE_LIMIT;

  return {
    short: {
      ttl,
      limit: override ? Number(override) : defaultLimit,
    },
  };
}
