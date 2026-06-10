import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../infrastructure/database/database.provider";

@Injectable()
export class AppService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async healthCheck() {
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        service: "debridgers-backend",
        db: "unreachable",
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: "ok",
      service: "debridgers-backend",
      db: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
