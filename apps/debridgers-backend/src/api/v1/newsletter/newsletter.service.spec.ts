import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ConflictException } from "@nestjs/common";
import { NewsletterService } from "./newsletter.service";
import * as schema from "../../../infrastructure/persistence/index";
import {
  createTestDatabase,
  databaseAvailable,
  type TestDb,
} from "../../../test/db";

/*
 * The subscribe path. A duplicate email must come back as a 409, not a 500.
 *
 * drizzle-orm 0.45 wraps the pg driver error in a DrizzleQueryError, so the
 * unique-violation SQLSTATE (23505) sits on `error.cause`, not `error`. The old
 * check read `error.code` only, never matched, and every repeat subscribe fell
 * through to an unhandled 500. These run against a real database because the
 * behaviour under test is the unique index firing.
 */

const hasDb = await databaseAvailable();

describe.skipIf(!hasDb)("NewsletterService", () => {
  let t: TestDb;
  let newsletter: NewsletterService;

  beforeAll(async () => {
    t = await createTestDatabase("newsletter");
    newsletter = new NewsletterService(t.db as never);
  }, 120000);

  afterAll(async () => {
    await t?.destroy();
  });

  beforeEach(async () => {
    await t.truncate();
  });

  async function rowCount(email: string): Promise<number> {
    const rows = await t.db.select().from(schema.newsletter_subscribers);
    return rows.filter((r) => r.email === email).length;
  }

  it("stores a new subscriber and confirms", async () => {
    const result = await newsletter.subscribe({ email: "new@example.com" });

    expect(result.message).toMatch(/subscribed/i);
    expect(await rowCount("new@example.com")).toBe(1);
  });

  it("rejects a duplicate with a ConflictException, not a 500", async () => {
    await newsletter.subscribe({ email: "dupe@example.com" });

    await expect(
      newsletter.subscribe({ email: "dupe@example.com" }),
    ).rejects.toBeInstanceOf(ConflictException);

    /* The failed insert left no second row behind. */
    expect(await rowCount("dupe@example.com")).toBe(1);
  });

  it("keeps distinct emails independent", async () => {
    await newsletter.subscribe({ email: "a@example.com" });
    await newsletter.subscribe({ email: "b@example.com" });

    expect(await rowCount("a@example.com")).toBe(1);
    expect(await rowCount("b@example.com")).toBe(1);
  });
});
