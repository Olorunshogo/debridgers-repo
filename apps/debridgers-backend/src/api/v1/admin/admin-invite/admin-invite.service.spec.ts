import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { AdminInviteService } from "./admin-invite.service";
import { EmailService } from "../../../../notification/features/email/email.service";
import { adminInvites, users } from "../../../../infrastructure/persistence";
import {
  createTestDatabase,
  databaseAvailable,
  type TestDb,
} from "../../../../test/db";

/*
 * createInvite used to run the user upsert, the invite row and the email with
 * no transaction and no catch. In dev there is no SMTP, so the send threw, the
 * request 500'd, and the caller lost the one-time code while an orphan
 * user + invite stayed behind. A repeat then dead-ended on a 400.
 *
 * These assert the fixed shape: row work is atomic, the email is best-effort
 * and reported back, and a repeat rotates the existing invite in place.
 */

const hasDb = await databaseAvailable();

interface EmailStub {
  sendAdminInvite: ReturnType<typeof vi.fn>;
}

describe.skipIf(!hasDb)("AdminInviteService.createInvite", () => {
  let t: TestDb;
  let email: EmailStub;
  let service: AdminInviteService;
  let superAdminId: number;

  beforeAll(async () => {
    t = await createTestDatabase("admin_invite");
  }, 120000);

  afterAll(async () => {
    await t?.destroy();
  });

  beforeEach(async () => {
    await t.truncate();
    email = { sendAdminInvite: vi.fn().mockResolvedValue(undefined) };
    service = new AdminInviteService(
      t.db as never,
      email as unknown as EmailService,
    );

    const [admin] = await t.db
      .insert(users)
      .values({
        first_name: "Super",
        last_name: "Admin",
        email: `super-${Date.now()}@example.com`,
        role: "admin",
        admin_tier: "super",
      })
      .returning();
    superAdminId = admin.id;
  });

  async function invitesFor(addr: string): Promise<number> {
    const rows = await t.db
      .select()
      .from(adminInvites)
      .where(eq(adminInvites.email, addr));
    return rows.length;
  }

  it("creates the sub-admin user and invite, sends the email", async () => {
    const result = await service.createInvite(
      "new-sub@example.com",
      superAdminId,
      "buyer",
    );

    expect(result.email_sent).toBe(true);
    expect(result.reissued).toBe(false);
    expect(result.invite_code).toHaveLength(32);
    expect(result.temp_password).toHaveLength(12);
    expect(email.sendAdminInvite).toHaveBeenCalledOnce();

    const [created] = await t.db
      .select()
      .from(users)
      .where(eq(users.email, "new-sub@example.com"));
    expect(created.role).toBe("admin");
    expect(created.admin_tier).toBe("sub");
    expect(created.admin_desk).toBe("buyer");
    expect(created.must_change_password).toBe(true);

    expect(await invitesFor("new-sub@example.com")).toBe(1);
  });

  it("creates an hr-desk sub-admin when desk=hr", async () => {
    await service.createInvite("hr-sub@example.com", superAdminId, "hr");
    const [created] = await t.db
      .select()
      .from(users)
      .where(eq(users.email, "hr-sub@example.com"));
    expect(created.admin_tier).toBe("sub");
    expect(created.admin_desk).toBe("hr");
  });

  it("still commits the rows and returns the code when the email fails", async () => {
    email.sendAdminInvite.mockRejectedValueOnce(new Error("no SMTP in dev"));

    const result = await service.createInvite(
      "offline@example.com",
      superAdminId,
    );

    expect(result.email_sent).toBe(false);
    expect(result.invite_code).toHaveLength(32);
    expect(result.temp_password).toHaveLength(12);

    /* The row work is not rolled back by a failed email. */
    expect(await invitesFor("offline@example.com")).toBe(1);
    const [user] = await t.db
      .select()
      .from(users)
      .where(eq(users.email, "offline@example.com"));
    expect(user).toBeDefined();

    /* The returned code is the live one. */
    await expect(
      service.validateInviteCode("offline@example.com", result.invite_code),
    ).resolves.toMatchObject({ email: "offline@example.com" });
  });

  it("rotates an existing live invite in place instead of erroring", async () => {
    const first = await service.createInvite(
      "repeat@example.com",
      superAdminId,
    );
    const second = await service.createInvite(
      "repeat@example.com",
      superAdminId,
    );

    expect(second.reissued).toBe(true);
    expect(second.invite_code).not.toBe(first.invite_code);

    /* One row, not two. */
    expect(await invitesFor("repeat@example.com")).toBe(1);

    /* The old code stops working, the new one is valid. */
    await expect(
      service.validateInviteCode("repeat@example.com", first.invite_code),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.validateInviteCode("repeat@example.com", second.invite_code),
    ).resolves.toMatchObject({ email: "repeat@example.com" });
  });

  it("rejects an unknown invite code", async () => {
    await service.createInvite("known@example.com", superAdminId);

    await expect(
      service.validateInviteCode("known@example.com", "deadbeef".repeat(4)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
