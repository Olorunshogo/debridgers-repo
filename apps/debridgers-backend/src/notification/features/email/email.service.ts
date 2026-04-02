import { Injectable } from "@nestjs/common";
import { CoreEmailService } from "../../core/email/email.service";

@Injectable()
export class EmailService {
  constructor(private readonly core: CoreEmailService) {}

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.core.send({
      to,
      toName: name,
      subject: "Welcome to Debridgers!",
      html: `
        <h2>Welcome, ${name}!</h2>
        <p>Thanks for joining Debridgers. We deliver fresh foodstuff at market prices, straight to your door.</p>
        <p>We'll keep you updated on everything happening.</p>
        <br/>
        <p>— The Debridgers Team</p>
      `,
    });
  }

  async sendAgentApplicationReceived(to: string, name: string): Promise<void> {
    await this.core.send({
      to,
      toName: name,
      subject: "Agent Application Received — Debridgers",
      html: `
        <h2>Hi ${name},</h2>
        <p>We've received your application to become a Debridgers agent. Our team will review it and get back to you within 48 hours.</p>
        <p>Once approved, you'll receive your login credentials and sales targets.</p>
        <br/>
        <p>— The Debridgers Team</p>
      `,
    });
  }

  async sendAgentApproved(
    to: string,
    name: string,
    tempPassword: string,
  ): Promise<void> {
    await this.core.send({
      to,
      toName: name,
      subject: "🎉 Your Agent Application is Approved — Debridgers",
      html: `
        <h2>Congratulations, ${name}!</h2>
        <p>Your application to become a Debridgers agent has been <strong>approved</strong>.</p>
        <p>Here are your login details:</p>
        <ul>
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>Temporary Password:</strong> <code>${tempPassword}</code></li>
        </ul>
        <p>Please log in and change your password immediately.</p>
        <a href="${process.env.APP_URL}/agent/login" style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Login to Dashboard</a>
        <br/><br/>
        <p>— The Debridgers Team</p>
      `,
    });
  }

  async sendAgentRejected(
    to: string,
    name: string,
    reason?: string,
  ): Promise<void> {
    await this.core.send({
      to,
      toName: name,
      subject: "Agent Application Update — Debridgers",
      html: `
        <h2>Hi ${name},</h2>
        <p>Thank you for applying to become a Debridgers agent. After reviewing your application, we're unable to proceed at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p>You're welcome to reapply in the future. If you have questions, reply to this email.</p>
        <br/>
        <p>— The Debridgers Team</p>
      `,
    });
  }

  async sendContactConfirmation(to: string, name: string): Promise<void> {
    await this.core.send({
      to,
      toName: name,
      subject: "We received your message — Debridgers",
      html: `
        <h2>Hi ${name},</h2>
        <p>Thanks for reaching out! We've received your message and will get back to you within 24 hours.</p>
        <br/>
        <p>— The Debridgers Team</p>
      `,
    });
  }

  async sendPasswordReset(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    await this.core.send({
      to,
      toName: name,
      subject: "Reset your Debridgers password",
      html: `
        <h2>Hi ${name},</h2>
        <p>We received a request to reset your password. Use the link below (expires in 1 hour):</p>
        <a href="${process.env.APP_URL}/reset-password?token=${token}" style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a>
        <p>If you didn't request this, ignore this email.</p>
        <br/>
        <p>— The Debridgers Team</p>
      `,
    });
  }
}
