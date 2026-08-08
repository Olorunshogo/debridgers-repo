import * as crypto from "crypto";

/*
 * Refresh token hashing.
 *
 * SHA-256, deliberately not bcrypt. bcrypt silently truncates its input at 72
 * bytes, and a JWT's first 72 bytes are the header plus the opening of the
 * payload - byte-identical across every token ever issued to a given user. When
 * this used bcrypt, all of a user's tokens hashed the same, so rotation revoked
 * nothing and an access token could be redeemed as a refresh token.
 *
 * A slow KDF buys nothing here: the token is already 256 bits of signed
 * entropy, not a guessable human secret. Passwords stay on bcrypt.
 *
 * Kept as free functions rather than AuthService methods so the invariant can
 * be tested without standing up the whole DI graph.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/*
 * Constant-time comparison of a presented token against a stored hash.
 *
 * The length check comes first because timingSafeEqual throws on mismatched
 * lengths, which is exactly what a pre-SHA-256 bcrypt hash still sitting in the
 * column would produce. Those fail closed and the user logs in again.
 */
export function refreshTokenMatches(
  storedHash: string,
  presentedToken: string,
): boolean {
  const stored = Buffer.from(storedHash);
  const presented = Buffer.from(hashRefreshToken(presentedToken));

  return (
    stored.length === presented.length &&
    crypto.timingSafeEqual(stored, presented)
  );
}
