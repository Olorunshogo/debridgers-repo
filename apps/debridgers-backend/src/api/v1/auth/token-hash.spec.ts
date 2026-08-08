import { describe, it, expect } from "vitest";
import * as bcrypt from "bcryptjs";
import { hashRefreshToken, refreshTokenMatches } from "./token-hash";

/*
 * Regression cover for a live bug: refresh tokens were hashed with bcrypt,
 * which truncates at 72 bytes. Every JWT issued to a user shares its first 72
 * bytes, so all of a user's tokens hashed identically - rotation revoked
 * nothing, and an access token was redeemable as a refresh token.
 */

// Header plus the opening of the payload: identical for every token of a user.
const SHARED_PREFIX =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEzNywiaWQiOjEzNywiZW1haWw";

const TOKEN_A = `${SHARED_PREFIX}iOiJhQGIuY29tIiwiaWF0IjoxMDAwfQ.signature-a`;
const TOKEN_B = `${SHARED_PREFIX}iOiJhQGIuY29tIiwiaWF0IjoyMDAwfQ.signature-b`;

describe("token-hash", () => {
  it("distinguishes tokens that share their first 72 bytes", () => {
    expect(TOKEN_A.slice(0, 72)).toBe(TOKEN_B.slice(0, 72));
    expect(hashRefreshToken(TOKEN_A)).not.toBe(hashRefreshToken(TOKEN_B));
  });

  it("matches a token against its own hash", () => {
    expect(refreshTokenMatches(hashRefreshToken(TOKEN_A), TOKEN_A)).toBe(true);
  });

  it("rejects a rotated-out token", () => {
    // TOKEN_B is what rotation stored, so presenting the old TOKEN_A must fail.
    expect(refreshTokenMatches(hashRefreshToken(TOKEN_B), TOKEN_A)).toBe(false);
  });

  it("fails closed on a legacy bcrypt hash left in the column", async () => {
    const legacy = await bcrypt.hash(TOKEN_A, 10);
    expect(refreshTokenMatches(legacy, TOKEN_A)).toBe(false);
  });

  it("documents why bcrypt is unusable here", async () => {
    /*
     * Not testing our code - pinning the third-party behaviour that caused the
     * bug, so a well-meaning revert back to bcrypt fails loudly right here.
     */
    const bcryptHash = await bcrypt.hash(TOKEN_A, 10);
    expect(await bcrypt.compare(TOKEN_B, bcryptHash)).toBe(true);
  });

  it("produces a fixed-length hex digest", () => {
    expect(hashRefreshToken(TOKEN_A)).toMatch(/^[0-9a-f]{64}$/);
  });
});
