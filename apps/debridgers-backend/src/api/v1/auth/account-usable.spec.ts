import { describe, it, expect } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type * as schema from "../../../infrastructure/persistence/index";

/*
 * The status gate that login and refresh call before minting tokens.
 *
 * Before this existed, only the agent login branch checked account status, so a
 * blocked or suspended buyer logged in and kept full access to the order and
 * wallet routes. This is a pure guard over the user row - no DB, no JWT - so it
 * is unit-tested directly.
 */

type UserRow = typeof schema.users.$inferSelect;

function userRow(overrides: Partial<UserRow>): UserRow {
  return {
    is_blocked: false,
    is_suspended: false,
    ...overrides,
  } as UserRow;
}

/* assertAccountUsable reads only its argument, so the DI deps are unused. */
const service = new AuthService(
  null as never,
  null as never,
  null as never,
  null as never,
  null as never,
  null as never,
  null as never,
);

const assertAccountUsable = (
  service as unknown as { assertAccountUsable: (user: UserRow) => void }
).assertAccountUsable.bind(service);

describe("AuthService.assertAccountUsable", () => {
  it("allows an account in good standing", () => {
    expect(() => assertAccountUsable(userRow({}))).not.toThrow();
  });

  it("blocks a blocked account", () => {
    expect(() => assertAccountUsable(userRow({ is_blocked: true }))).toThrow(
      ForbiddenException,
    );
  });

  it("blocks a suspended account", () => {
    expect(() => assertAccountUsable(userRow({ is_suspended: true }))).toThrow(
      ForbiddenException,
    );
  });

  it("mentions support in the message so the user knows where to go", () => {
    expect(() => assertAccountUsable(userRow({ is_blocked: true }))).toThrow(
      /support/i,
    );
  });
});
