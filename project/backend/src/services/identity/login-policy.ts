export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 1000 * 60 * 15;

/** Determines whether a current lockout prevents a login attempt. */
export function isAccountLocked(lockedUntil: Date | null, now = new Date()): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/** Calculates the post-failure counter and temporary lockout expiry. */
export function calculateFailedLoginState(
  failedLoginCount: number,
  now = new Date()
): { failedLoginCount: number; lockedUntil: Date | null } {
  const nextCount = failedLoginCount + 1;
  if (nextCount < MAX_FAILED_LOGIN_ATTEMPTS) {
    return { failedLoginCount: nextCount, lockedUntil: null };
  }

  return {
    failedLoginCount: 0,
    lockedUntil: new Date(now.getTime() + LOGIN_LOCKOUT_MS),
  };
}
