import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailtrapClient } from "mailtrap";

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  category?: string;
}

@Injectable()
export class CoreEmailService {
  private readonly logger = new Logger(CoreEmailService.name);
  private client: MailtrapClient;
  private fromEmail: string;
  private fromName: string;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>("MailtrapConfig.token") ?? "";

    if (!token) {
      this.logger.warn("MAILTRAP_TOKEN is not set — emails will fail to send");
    } else {
      this.logger.log("Mailtrap client initialized");
    }

    this.client = new MailtrapClient({ token });
    this.fromEmail =
      this.config.get<string>("MailtrapConfig.fromEmail") ??
      "noreply@debridgers.com";
    this.fromName =
      this.config.get<string>("MailtrapConfig.fromName") ?? "Debridgers";
  }

  async send(options: SendEmailOptions): Promise<void> {
    try {
      await this.client.send({
        from: { email: this.fromEmail, name: this.fromName },
        to: [{ email: options.to, name: options.toName }],
        subject: options.subject,
        html: options.html,
        text: options.text ?? options.subject,
        category: options.category,
      });
      this.logger.log(`Email sent to ${options.to} — "${options.subject}"`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, err);
      throw err;
    }
  }
}
