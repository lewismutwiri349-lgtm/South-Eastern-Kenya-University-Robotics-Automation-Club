import { describe, expect, it } from "vitest";
import {
  calculateFailedLoginState,
  isAccountLocked,
  LOGIN_LOCKOUT_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "./login-policy";

describe("login lockout policy", () => {
  it("does not lock an account before the threshold", () => {
    const state = calculateFailedLoginState(MAX_FAILED_LOGIN_ATTEMPTS - 2);
    expect(state).toEqual({ failedLoginCount: MAX_FAILED_LOGIN_ATTEMPTS - 1, lockedUntil: null });
  });

  it("locks an account at the threshold", () => {
    const now = new Date("2026-08-11T10:00:00.000Z");
    const state = calculateFailedLoginState(MAX_FAILED_LOGIN_ATTEMPTS - 1, now);
    expect(state.failedLoginCount).toBe(0);
    expect(state.lockedUntil).toEqual(new Date(now.getTime() + LOGIN_LOCKOUT_MS));
  });

  it("treats only a future expiry as an active lock", () => {
    const now = new Date("2026-08-11T10:00:00.000Z");
    expect(isAccountLocked(new Date(now.getTime() + 1), now)).toBe(true);
    expect(isAccountLocked(now, now)).toBe(false);
  });
});
