import { Injectable, Inject, Logger } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../persistence/index";
import { DATABASE_CONNECTION } from "../database/database.provider";

export interface AuditLogEntry {
  admin_id: number | null;
  action: string;
  resource_type: string;
  resource_id?: number | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Append-only trail of privileged admin mutations (F9).
 *
 * Writes are best effort: a failed audit insert must never turn a successful
 * admin action into a request error, so failures are logged and swallowed.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async record(entry: AuditLogEntry): Promise<void> {
    try {
      await this.db.insert(schema.admin_audit_log).values({
        admin_id: entry.admin_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id ?? null,
        details: entry.details ?? null,
        ip_address: entry.ip_address ?? null,
        user_agent: entry.user_agent ?? null,
      });
    } catch (err) {
      this.logger.error(
        `Failed to record audit entry ${entry.action} on ${entry.resource_type}:${entry.resource_id ?? "-"}`,
        err as Error,
      );
    }
  }
}
