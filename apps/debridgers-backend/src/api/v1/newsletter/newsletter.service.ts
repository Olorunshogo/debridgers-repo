import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { SubscribeNewsletterDto } from "./dto/subscribe-newsletter.dto";

@Injectable()
export class NewsletterService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async subscribe(dto: SubscribeNewsletterDto) {
    try {
      await this.db
        .insert(schema.newsletter_subscribers)
        .values({ email: dto.email });
    } catch (error) {
      /* drizzle-orm 0.45 wraps the pg driver error in a DrizzleQueryError, so
         the SQLSTATE lives on error.cause, not error itself. Check both. */
      const code: string | undefined = this.pgErrorCode(error);
      if (code === "23505") {
        throw new ConflictException("You're already subscribed");
      }
      throw error;
    }

    return {
      message: "Subscribed! Watch your inbox for market updates.",
      data: null,
    };
  }

  private pgErrorCode(error: unknown): string | undefined {
    const read = (val: unknown): string | undefined => {
      if (val && typeof val === "object" && "code" in val) {
        const code: unknown = (val as { code: unknown }).code;
        return typeof code === "string" ? code : undefined;
      }
      return undefined;
    };

    return (
      read(error) ??
      read(
        error && typeof error === "object" && "cause" in error
          ? (error as { cause: unknown }).cause
          : undefined,
      )
    );
  }
}
