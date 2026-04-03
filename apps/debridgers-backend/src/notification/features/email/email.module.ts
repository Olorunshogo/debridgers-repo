import { Module } from "@nestjs/common";
import { CoreEmailService } from "../../core/email/email.service";
import { EmailService } from "./email.service";

@Module({
  providers: [CoreEmailService, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
