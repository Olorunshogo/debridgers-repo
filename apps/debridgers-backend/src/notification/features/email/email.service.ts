import { Injectable } from "@nestjs/common";
import { CoreEmailService } from "../../core/email/email.service";

type AppRole = "admin" | "agent" | "buyer" | "company";

const BRAND_GREEN = "#1E5925";
const BRAND_ORANGE = "#EF9E0B";
const LOGO_WHITE = `${process.env.APP_URL}/logos/debridgers-white.png`;

function isAgentOrAdmin(role: AppRole): boolean {
  return role === "agent" || role === "admin";
}

function layout(opts: {
  headerBg: string;
  outerBg: string;
  title: string;
  preheader?: string;
  body: string;
}): string {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${opts.outerBg};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1f2937;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:${opts.outerBg};">${opts.preheader}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${opts.outerBg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:${opts.headerBg};padding:28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <img src="${LOGO_WHITE}" alt="Debridgers" height="36" style="display:block;height:36px;width:auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          ${opts.body}

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#9ca3af;text-align:center;">
                &copy; ${year} Debridgers. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                If you have questions, contact us at <a href="mailto:support@debridgers.com" style="color:#9ca3af;">support@debridgers.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function button(label: string, href: string, bg: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0;">
      <tr>
        <td style="border-radius:8px;background:${bg};">
          <a href="${href}" style="display:inline-block;padding:13px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;">${label}</a>
        </td>
      </tr>
    </table>
  `;
}

function infoBox(
  text: string,
  borderColor: string,
  bgColor: string,
  textColor: string,
): string {
  return `
    <tr>
      <td style="padding:0 32px 24px 32px;">
        <div style="padding:14px 16px;border-left:4px solid ${borderColor};background:${bgColor};border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:13px;line-height:1.65;color:${textColor};">${text}</p>
        </div>
      </td>
    </tr>
  `;
}

@Injectable()
export class EmailService {
  constructor(private readonly core: CoreEmailService) {}

  // === Welcome

  async sendWelcome(to: string, name: string, role: AppRole): Promise<void> {
    const orange = isAgentOrAdmin(role);
    const headerBg = orange ? BRAND_ORANGE : BRAND_GREEN;
    const outerBg = orange ? "#fff8ed" : "#f6f9f7";
    const btnBg = orange ? BRAND_ORANGE : BRAND_GREEN;
    const roleLabel =
      role === "admin" ? "Admin" : role === "agent" ? "Agent" : "Buyer";

    const html = layout({
      headerBg,
      outerBg,
      title: "Welcome to Debridgers",
      preheader: `Welcome to Debridgers, ${name}. Your account is ready.`,
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Welcome, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your <strong>${roleLabel}</strong> account has been created successfully. Debridgers delivers fresh foodstuff at market prices, straight to your door.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              We will keep you updated on orders, deliveries, and everything happening on the platform.
            </p>
            ${button("Go to your account", `${process.env.APP_URL}/login`, btnBg)}
          </td>
        </tr>
        ${infoBox(
          "Keep your login credentials safe and do not share them with anyone.",
          btnBg,
          orange ? "#fffbeb" : "#f0fdf4",
          orange ? "#92400e" : "#14532d",
        )}
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Welcome to Debridgers",
      html,
    });
  }

  // === Agent Welcome

  async sendAgentWelcome(to: string, name: string): Promise<void> {
    const html = layout({
      headerBg: BRAND_ORANGE,
      outerBg: "#fff8ed",
      title: "Welcome to the Debridgers Agent Network",
      preheader: `Welcome, ${name}. Your agent account is under review.`,
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Welcome to the Agent Network, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Thank you for registering as a Debridgers agent. We are glad to have you on our team.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your account needs email verification first. After that, our team will review your agent profile and activate your dashboard access once everything is confirmed.
            </p>
          </td>
        </tr>
        ${infoBox(
          "<strong>Next step:</strong> Verify your email using the OTP we just sent, then wait for team approval before logging in.",
          BRAND_ORANGE,
          "#fffbeb",
          "#92400e",
        )}
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              We are excited to work with you.<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Welcome to the Debridgers Agent Network",
      html,
    });
  }

  // === Agent Application Received

  async sendAgentApplicationReceived(to: string, name: string): Promise<void> {
    const html = layout({
      headerBg: BRAND_ORANGE,
      outerBg: "#fff8ed",
      title: "Agent Application Received",
      preheader:
        "We have received your agent application and will review it shortly.",
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Application Received, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              We have received your application to become a Debridgers agent. Our team will review your details and get back to you within <strong>48 hours</strong>.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              Once approved, you will receive a confirmation email with next steps to access your agent dashboard.
            </p>
          </td>
        </tr>
        ${infoBox(
          "Please ensure you have completed your profile fully to avoid delays in the review process.",
          BRAND_ORANGE,
          "#fffbeb",
          "#92400e",
        )}
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Thank you for your interest.<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Agent Application Received - Debridgers",
      html,
    });
  }

  // === Agent Approved

  async sendAgentApproved(to: string, name: string): Promise<void> {
    const html = layout({
      headerBg: BRAND_GREEN,
      outerBg: "#f6f9f7",
      title: "Agent Application Approved",
      preheader: `Congratulations ${name}, your agent application has been approved.`,
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Congratulations, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your application to become a Debridgers agent has been <strong style="color:${BRAND_GREEN};">approved</strong>. You can now log in to your agent dashboard using the email and password you registered with.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your dashboard gives you access to your sales targets, referrals, commissions, and daily operations.
            </p>
            ${button("Go to Agent Dashboard", `${process.env.APP_URL}/agent/login`, BRAND_GREEN)}
          </td>
        </tr>
        ${infoBox(
          "If you have any questions about your dashboard or targets, reply to this email and our team will assist you.",
          BRAND_GREEN,
          "#f0fdf4",
          "#14532d",
        )}
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Welcome aboard.<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Your Agent Application is Approved - Debridgers",
      html,
    });
  }

  // === Agent Rejected

  async sendAgentRejected(
    to: string,
    name: string,
    reason?: string,
  ): Promise<void> {
    const html = layout({
      headerBg: "#4b5563",
      outerBg: "#f4f6f8",
      title: "Agent Application Update",
      preheader: "An update regarding your Debridgers agent application.",
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Application Update, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Thank you for applying to become a Debridgers agent. After reviewing your application, we are unable to proceed at this time.
            </p>
            ${
              reason
                ? `<div style="padding:14px 16px;border-left:4px solid #d1d5db;background:#f9fafb;border-radius:0 8px 8px 0;margin-bottom:16px;">
                   <p style="margin:0;font-size:13px;color:#374151;"><strong>Reason:</strong> ${reason}</p>
                 </div>`
                : ""
            }
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              You are welcome to reapply in the future. If you have questions or would like further clarification, please reply to this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              We appreciate your interest in Debridgers.<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Agent Application Update - Debridgers",
      html,
    });
  }

  // === Contact Confirmation

  async sendContactConfirmation(to: string, name: string): Promise<void> {
    const html = layout({
      headerBg: BRAND_GREEN,
      outerBg: "#f6f9f7",
      title: "Message Received - Debridgers",
      preheader:
        "We received your message and will get back to you within 24 hours.",
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Message Received, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Thank you for reaching out to Debridgers. We have received your message and one of our team members will respond within <strong>24 hours</strong>.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              In the meantime, if your message is urgent, you can reach us directly at <a href="mailto:support@debridgers.com" style="color:${BRAND_GREEN};text-decoration:none;">support@debridgers.com</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Thank you,<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "We received your message - Debridgers",
      html,
    });
  }

  // === Email Verification

  async sendEmailVerification(
    to: string,
    name: string,
    otp: string,
    role: AppRole,
  ): Promise<void> {
    const orange = isAgentOrAdmin(role);
    const headerBg = orange ? BRAND_ORANGE : BRAND_GREEN;
    const outerBg = orange ? "#fff8ed" : "#f6f9f7";
    const otpBg = orange ? "#fffbeb" : "#f0fdf4";
    const otpBorder = orange ? "#fde68a" : "#a7f3d0";
    const otpColor = orange ? "#92400e" : "#064e3b";
    const verifyLink = `${process.env.APP_URL}/verify-email?email=${encodeURIComponent(to)}&otp=${encodeURIComponent(otp)}`;

    const html = layout({
      headerBg,
      outerBg,
      title: "Verify Your Email - Debridgers",
      preheader: `Your Debridgers verification code is ${otp}. Valid for 24 hours.`,
      body: `
        <tr>
          <td style="padding:32px 32px 16px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Verify your email address</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi ${name}, thank you for registering with Debridgers. Use the OTP below to verify your email address and activate your account.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 16px 32px;text-align:center;">
            <div style="display:inline-block;padding:24px 32px;background:${otpBg};border:2px dashed ${otpBorder};border-radius:12px;min-width:200px;">
              <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${otpColor};font-weight:600;">Your OTP</p>
              <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:10px;color:${otpColor};">${otp}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px 32px;text-align:center;">
            <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;">Or click the button below to verify automatically</p>
            ${button("Verify my email", verifyLink, headerBg)}
          </td>
        </tr>
        ${infoBox(
          "This OTP expires in <strong>24 hours</strong>. If you did not create this account, you can safely ignore this email.",
          headerBg,
          otpBg,
          otpColor,
        )}
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Your verification OTP - Debridgers",
      category: "verification",
      html,
    });
  }

  // === Buyer Login Notification

  async sendBuyerLoginMessage(to: string, name: string): Promise<void> {
    const html = layout({
      headerBg: BRAND_GREEN,
      outerBg: "#f6f9f7",
      title: "Sign-in Confirmed - Debridgers",
      preheader: `${name}, you have successfully signed in to your Debridgers account.`,
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Welcome back, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              You have successfully signed in to your Debridgers account. We are always grateful to serve your home with fresh essentials at fair market prices.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              Thank you for trusting Debridgers with your family shopping.
            </p>
            ${button("Open your account", `${process.env.APP_URL}/login`, BRAND_GREEN)}
          </td>
        </tr>
        ${infoBox(
          "<strong>Security notice:</strong> If this sign-in was not made by you, reset your password immediately and contact our support team.",
          "#ef4444",
          "#fef2f2",
          "#991b1b",
        )}
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              With care,<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "You are safely signed in - Debridgers",
      html,
    });
  }

  // === Agent Login Notification

  async sendAgentLoginMessage(to: string, name: string): Promise<void> {
    const html = layout({
      headerBg: BRAND_ORANGE,
      outerBg: "#fff8ed",
      title: "Agent Sign-in Confirmed - Debridgers",
      preheader: `${name}, your Debridgers agent account has been accessed.`,
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Sign-in confirmed, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your Debridgers agent account has been signed in successfully. You can continue with your assigned targets, report updates, and daily operations from your dashboard.
            </p>
            ${button("Go to Agent Dashboard", `${process.env.APP_URL}/agent/login`, BRAND_ORANGE)}
          </td>
        </tr>
        ${infoBox(
          "<strong>Security alert:</strong> If this sign-in was not made by you, reset your password immediately and contact our support team.",
          "#ef4444",
          "#fef2f2",
          "#991b1b",
        )}
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Regards,<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Agent sign-in confirmed - Debridgers",
      html,
    });
  }

  // === Password Reset Request

  async sendPasswordReset(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;

    const html = layout({
      headerBg: BRAND_GREEN,
      outerBg: "#f6f9f7",
      title: "Reset Your Password - Debridgers",
      preheader:
        "We received a request to reset your Debridgers password. The link expires in 1 hour.",
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Reset your password</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi ${name}, we received a request to reset the password for your Debridgers account. Click the button below to set a new password.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              This link expires in <strong>1 hour</strong>.
            </p>
            ${button("Reset Password", resetLink, BRAND_GREEN)}
            <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
              If the button does not work, copy and paste this link into your browser:<br/>
              <a href="${resetLink}" style="color:${BRAND_GREEN};">${resetLink}</a>
            </p>
          </td>
        </tr>
        ${infoBox(
          "If you did not request a password reset, you can safely ignore this email. Your password will not change.",
          BRAND_GREEN,
          "#f0fdf4",
          "#14532d",
        )}
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Reset your Debridgers password",
      html,
    });
  }

  // === Password Reset Confirmation

  async sendPasswordResetConfirmation(to: string, name: string): Promise<void> {
    const html = layout({
      headerBg: BRAND_GREEN,
      outerBg: "#f6f9f7",
      title: "Password Changed - Debridgers",
      preheader: "Your Debridgers password has been changed successfully.",
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Password changed successfully</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi ${name}, your Debridgers account password has been updated successfully. You can now log in with your new password.
            </p>
            ${button("Log in to your account", `${process.env.APP_URL}/login`, BRAND_GREEN)}
          </td>
        </tr>
        ${infoBox(
          "<strong>Security notice:</strong> If you did not make this change, your account may have been compromised. Contact us immediately at <a href='mailto:support@debridgers.com' style='color:#991b1b;'>support@debridgers.com</a>.",
          "#ef4444",
          "#fef2f2",
          "#991b1b",
        )}
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Stay secure,<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Your password has been changed - Debridgers",
      html,
    });
  }

  async sendDepositConfirmation(
    to: string,
    name: string,
    amount: string,
    reference: string,
  ): Promise<void> {
    const html = layout({
      headerBg: BRAND_GREEN,
      outerBg: "#f6f9f7",
      title: "Deposit Confirmed - Debridgers",
      preheader: `Your wallet deposit of ${amount} has been confirmed.`,
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Deposit confirmed! 🎉</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi ${name}, your wallet deposit has been successfully processed.
            </p>
          </td>
        </tr>
        ${infoBox(
          `<strong>Amount:</strong> ${amount}<br/><strong>Reference:</strong> ${reference}<br/><strong>Status:</strong> Completed`,
          BRAND_GREEN,
          "#ecfdf5",
          "#065f46",
        )}
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your funds are now available in your wallet. You can use them to place orders or continue shopping.
            </p>
            ${button("Go to wallet", `${process.env.APP_URL}/buyer-dashboard/wallet`, BRAND_GREEN)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Thank you for shopping with us,<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: `Deposit Confirmed - ${amount} added to your wallet`,
      html,
    });
  }

  async sendOrderConfirmation(
    to: string,
    name: string,
    orderId: string,
    amount: string,
    itemCount: number,
  ): Promise<void> {
    const html = layout({
      headerBg: BRAND_GREEN,
      outerBg: "#f6f9f7",
      title: "Order Confirmed - Debridgers",
      preheader: `Your order #${orderId} has been confirmed.`,
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Order confirmed! ✓</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi ${name}, your order has been successfully placed and is being processed.
            </p>
          </td>
        </tr>
        ${infoBox(
          `<strong>Order ID:</strong> #${orderId}<br/><strong>Items:</strong> ${itemCount} pack${itemCount !== 1 ? "s" : ""}<br/><strong>Total:</strong> ${amount}`,
          BRAND_GREEN,
          "#ecfdf5",
          "#065f46",
        )}
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#374151;">
              We're preparing your order for delivery. You'll receive an update once it's on the way. Track your order anytime from your dashboard.
            </p>
            ${button("Track your order", `${process.env.APP_URL}/buyer-dashboard/orders`, BRAND_GREEN)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Questions? Contact us at <a href="mailto:support@debridgers.com" style="color:#1E5925;text-decoration:none;">support@debridgers.com</a><br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: `Order Confirmed - ${orderId} - ${amount}`,
      html,
    });
  }
}
