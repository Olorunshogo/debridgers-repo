import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { USER_EVENTS } from "../../events/event-types/user.event.types";
import { CreateContactDto } from "./dto/create-contact.dto";

@Injectable()
export class ContactService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submit(dto: CreateContactDto) {
    const [lead] = await this.db
      .insert(schema.leads)
      .values({
        full_name: dto.full_name,
        email: dto.email,
        message: dto.message,
      })
      .returning();

    this.eventEmitter.emit(USER_EVENTS.CONTACT_SUBMITTED, {
      name: lead.full_name,
      email: lead.email,
    });

    return {
      message: "Message received. We'll get back to you shortly.",
      data: { id: lead.id },
    };
  }
}
