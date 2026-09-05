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
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        throw new ConflictException("You're already subscribed");
      }
      throw error;
    }

    return {
      message: "Subscribed! Watch your inbox for market updates.",
      data: null,
    };
  }
}
