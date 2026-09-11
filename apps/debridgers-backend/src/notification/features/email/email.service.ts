import { Injectable } from "@nestjs/common";
import { CoreEmailService } from "../../core/email/email.service";
import { formatNaira } from "../../../api/shared/money";
import { emailLinks } from "./email-links";

type AppRole =
  | "admin"
  | "agent"
  | "buyer"
  | "company"
  | "applicant"
  | "employee";

const BRAND_GREEN = "#1E5925";
const BRAND_ORANGE = "#EF9E0B";
const ACCENT_BAR = "#F3E6C4";
const OUTER_BG = "#F4F4F1";
const MUTED = "#6B7280";

function isAgentOrAdmin(role: AppRole): boolean {
  return role === "agent" || role === "admin";
}

function isPeopleRole(role: AppRole): boolean {
  return role === "applicant" || role === "employee";
}

/*
 * PDF email system (Email template for DEBRIDGERS): white card, brand logo,
 * gold accent rule, category badge, sharp green CTA, Kaduna footer.
 * headerBg/outerBg kept optional so older call sites still typecheck while
 * every send uses the same chrome.
 *
 * Logo URL is resolved at render time, not module load: APP_URL is not in
 * process.env until ConfigModule boots, and a frozen localhost URL is what
 * made the wordmark a broken image in Gmail.
 */
function layout(opts: {
  title: string;
  preheader?: string;
  badge?: string;
  eyebrow?: string;
  metaRight?: string;
  body: string;
  /** @deprecated Ignored - PDF layout is white chrome for every mail. */
  headerBg?: string;
  /** @deprecated Ignored - PDF layout uses OUTER_BG. */
  outerBg?: string;
}): string {
  const year = new Date().getFullYear();
  const support = emailLinks.supportEmail();
  const logo = emailLinks.logo();
  const eyebrow = opts.eyebrow
    ? `<td align="right" style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#9CA3AF;font-weight:600;vertical-align:top;">${opts.eyebrow}</td>`
    : "";
  const metaRight = opts.metaRight
    ? `<span style="float:right;font-size:12px;color:${MUTED};font-weight:500;">${opts.metaRight}</span>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${OUTER_BG};font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${OUTER_BG};">${opts.preheader}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${OUTER_BG};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #E8E8E3;">

          <!-- Brand header -->
          <tr>
            <td style="padding:28px 32px 18px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:top;">
                    <img src="${logo}" alt="Debridgers" width="180" height="40" style="display:block;height:40px;width:auto;max-width:180px;border:0;outline:none;text-decoration:none;" />
                    <p style="margin:8px 0 0 0;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#9CA3AF;">Bulk food commodities · Kaduna</p>
                  </td>
                  ${eyebrow}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold accent rule -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:3px;background:${ACCENT_BAR};line-height:3px;font-size:0;">&nbsp;</div>
            </td>
          </tr>

          <!-- Category badge -->
          <tr>
            <td style="padding:20px 32px 0 32px;">
              <span style="display:inline-block;padding:6px 12px;background:${ACCENT_BAR};color:#5C4813;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">${opts.badge || "Debridgers"}</span>
              ${metaRight}
            </td>
          </tr>

          ${opts.body}

          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px 32px 32px;border-top:1px solid #EFEFEA;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:${MUTED};">
                ${emailLinks.companyAddressLine()}
              </p>
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:${MUTED};">
                Feel free to ask questions
                <a href="mailto:${support}" style="color:${BRAND_GREEN};text-decoration:none;">${support}</a>
              </p>
              <p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;">
                <a href="${emailLinks.whatsapp()}" style="color:${BRAND_GREEN};text-decoration:none;">WhatsApp</a>
                <span style="color:#D1D5DB;"> · </span>
                <a href="${emailLinks.linkedin()}" style="color:${BRAND_GREEN};text-decoration:none;">LinkedIn</a>
              </p>
              <p style="margin:0;font-size:11px;color:#9CA3AF;">
                &copy; ${year} Debridgers. All rights reserved.
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

function button(label: string, href: string, bg: string = BRAND_GREEN): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0;">
      <tr>
        <td style="background:${bg};">
          <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.2px;">${label}</a>
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
        <div style="padding:14px 16px;border-left:4px solid ${borderColor};background:${bgColor};">
          <p style="margin:0;font-size:13px;line-height:1.65;color:${textColor};">${text}</p>
        </div>
      </td>
    </tr>
  `;
}

function featureRow(text: string): string {
  return `
    <tr>
      <td style="padding:0 0 10px 0;font-size:14px;line-height:1.6;color:#374151;">
        <span style="color:${BRAND_GREEN};font-weight:700;padding-right:8px;">✓</span>${text}
      </td>
    </tr>
  `;
}

@Injectable()
export class EmailService {
  constructor(private readonly core: CoreEmailService) {}

  // === Welcome

  async sendWelcome(to: string, name: string, role: AppRole): Promise<void> {
    const firstName = name.split(/\s+/)[0] || name;
    const isBuyer = role === "buyer" || role === "company";

    if (isBuyer) {
      const html = layout({
        title: "Welcome to Debridgers",
        preheader: `Your Debridgers account is ready, ${firstName}.`,
        badge: "Buyer account created",
        eyebrow: "Buyers",
        body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;line-height:1.25;">Welcome, ${firstName}</h2>
            <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your buyer account is live. Debridgers sources grain, beans, tubers and oils in bulk from farmers across Kaduna State and delivers them to kitchens that cannot afford a short supply week.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;">
              ${featureRow("Browse current commodity prices, updated every market day")}
              ${featureRow("Place a bulk order and pick a delivery window across Kaduna metro")}
              ${featureRow("Fund your wallet to settle deliveries without cash on site")}
            </table>
            ${button("Go to your account", emailLinks.login(role))}
          </td>
        </tr>
        ${infoBox(
          "Keep your login details private. Debridgers staff will never ask you for your password or verification code.",
          BRAND_ORANGE,
          "#FBF6E9",
          "#5C4813",
        )}
      `,
      });

      await this.core.send({
        to,
        toName: name,
        subject: "Your Debridgers account is ready",
        html,
      });
      return;
    }

    const roleLabel =
      role === "admin"
        ? "Admin"
        : isPeopleRole(role)
          ? role.charAt(0).toUpperCase() + role.slice(1)
          : "Agent";
    const html = layout({
      title: "Welcome to Debridgers",
      preheader: `Welcome to Debridgers, ${firstName}. Your account is ready.`,
      badge: `${roleLabel} account created`,
      eyebrow: roleLabel === "Admin" ? "Admin" : "Agents",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Welcome, ${firstName}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your <strong>${roleLabel}</strong> account has been created successfully.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              We will keep you updated on orders, deliveries, and everything happening on the platform.
            </p>
            ${button("Go to your account", emailLinks.login(role))}
          </td>
        </tr>
        ${infoBox(
          "Keep your login details private. Debridgers staff will never ask you for your password or verification code.",
          BRAND_ORANGE,
          "#FBF6E9",
          "#5C4813",
        )}
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Your Debridgers account is ready",
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
      badge: "Agent registration",
      eyebrow: "Agents",
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
      badge: "Application received",
      eyebrow: "Agents",
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
            ${button("Go to Agent Dashboard", emailLinks.agentDashboard(), BRAND_GREEN)}
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

  // === Agent KYC Approved

  async sendAgentKycApproved(to: string, name: string): Promise<void> {
    const html = layout({
      headerBg: BRAND_GREEN,
      outerBg: "#f6f9f7",
      title: "KYC Verification Approved",
      preheader: `Good news ${name}, your KYC verification has been approved.`,
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">You're verified, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your identity and bank details have been <strong style="color:${BRAND_GREEN};">verified</strong>. You can now request stock from the warehouse and start selling.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              Head to your dashboard to place your first stock request.
            </p>
            ${button("Go to Agent Dashboard", emailLinks.login("agent"), BRAND_GREEN)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Let's get you selling.<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Your KYC Verification is Approved - Debridgers",
      html,
    });
  }

  // === Agent KYC Rejected

  async sendAgentKycRejected(
    to: string,
    name: string,
    reason?: string,
  ): Promise<void> {
    const html = layout({
      headerBg: "#4b5563",
      outerBg: "#f4f6f8",
      title: "KYC Verification Update",
      preheader: "An update regarding your Debridgers KYC verification.",
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Verification Update, ${name}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              We reviewed the documents you submitted for KYC verification and could not approve them at this time.
            </p>
            ${
              reason
                ? `<div style="padding:14px 16px;border-left:4px solid #d1d5db;background:#f9fafb;border-radius:0 8px 8px 0;margin-bottom:16px;">
                   <p style="margin:0;font-size:13px;color:#374151;"><strong>Reason:</strong> ${reason}</p>
                 </div>`
                : ""
            }
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              Please log in to your dashboard and resubmit your documents to continue.
            </p>
            ${button("Resubmit KYC", emailLinks.login("agent"), "#4b5563")}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              We're happy to review again once resubmitted.<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "KYC Verification Update - Debridgers",
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
    const firstName = name.split(/\s+/)[0] || name;
    const verifyLink = emailLinks.verifyEmail(to, otp, role);
    const spacedOtp = otp.split("").join(" ");
    const eyebrow = isAgentOrAdmin(role)
      ? role === "admin"
        ? "Admin"
        : "Agents"
      : isPeopleRole(role)
        ? "People"
        : "Buyers";

    const html = layout({
      title: "Verify Your Email - Debridgers",
      preheader: `Your Debridgers verification code is ${otp}.`,
      badge: "Email verification",
      eyebrow,
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;line-height:1.25;">Verify your email address</h2>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi ${firstName}, thank you for registering with Debridgers. Enter the code below to activate your account.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 16px 32px;">
            <div style="padding:28px 24px;background:#F5F6F4;text-align:center;">
              <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND_GREEN};font-weight:700;">Your verification code</p>
              <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:10px;color:${BRAND_GREEN};font-family:'Courier New',Courier,monospace;">${spacedOtp}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px 32px;">
            <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#374151;">
              This code expires in <strong>24 hours</strong>. Do not share it with anyone, including Debridgers staff.
            </p>
            ${button("Verify my email", verifyLink)}
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "Your Debridgers verification code",
      category: "verification",
      html,
    });
  }

  // === Buyer Login Notification

  async sendBuyerLoginMessage(
    to: string,
    name: string,
    meta?: { when?: string; device?: string; location?: string },
  ): Promise<void> {
    const firstName = name.split(/\s+/)[0] || name;
    const when =
      meta?.when ||
      new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Africa/Lagos",
        timeZoneName: "short",
      }).format(new Date());
    const device = meta?.device || "Unknown device";
    const location = meta?.location || "Kaduna, Nigeria";
    const metaRight = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Lagos",
    }).format(new Date());

    const detailRow = (label: string, value: string, alt: boolean) => `
      <tr>
        <td style="padding:12px 14px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};font-weight:700;width:110px;background:${alt ? "#EEF0ED" : "#F5F6F4"};">${label}</td>
        <td style="padding:12px 14px;font-size:14px;color:#111827;background:${alt ? "#EEF0ED" : "#F5F6F4"};">${value}</td>
      </tr>
    `;

    const html = layout({
      title: "Sign-in Confirmed - Debridgers",
      preheader: `New sign-in to your Debridgers account.`,
      badge: "New sign-in",
      eyebrow: "Security",
      metaRight,
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;line-height:1.25;">You signed in to Debridgers</h2>
            <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi ${firstName}, we noticed a sign-in to your account. If this was you, no action is needed.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;border-collapse:collapse;">
              ${detailRow("When", when, false)}
              ${detailRow("Device", device, true)}
              ${detailRow("Location", location, false)}
            </table>
          </td>
        </tr>
        ${infoBox(
          `Was this not you? Reset your password immediately and call ${emailLinks.supportPhoneDisplay()}.`,
          "#DC2626",
          "#FEF2F2",
          "#991B1B",
        )}
        <tr>
          <td style="padding:0 32px 24px 32px;">
            ${button("Review account activity", emailLinks.login("buyer"))}
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to,
      toName: name,
      subject: "New sign-in to your Debridgers account",
      html,
    });
  }

  // === Agent Login Notification

  async sendAgentLoginMessage(
    to: string,
    name: string,
    meta?: { when?: string; device?: string; location?: string },
  ): Promise<void> {
    await this.sendBuyerLoginMessage(to, name, meta);
  }

  // === Password Reset Request

  async sendPasswordReset(
    to: string,
    name: string,
    token: string,
    role?: AppRole,
  ): Promise<void> {
    const firstName = name.split(/\s+/)[0] || name;
    const resetLink = emailLinks.resetPassword(token, role);

    const html = layout({
      title: "Reset Your Password - Debridgers",
      preheader: "Reset your Debridgers password. This link expires in 1 hour.",
      badge: "Password reset requested",
      eyebrow: "Security",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;line-height:1.25;">Reset your password</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi ${firstName}, we received a request to reset the password on your Debridgers account. Set a new one using the button below. This link expires in <strong>1 hour</strong>.
            </p>
            ${button("Set a new password", resetLink)}
            <p style="margin:20px 0 8px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};font-weight:700;">Or copy this link into your browser</p>
            <div style="padding:12px 14px;background:#F5F6F4;word-break:break-all;">
              <a href="${resetLink}" style="font-size:12px;color:${MUTED};text-decoration:none;">${resetLink}</a>
            </div>
          </td>
        </tr>
        ${infoBox(
          `Did not request this? Ignore this email — your password stays unchanged. If it keeps happening, contact <a href="mailto:${emailLinks.supportEmail()}" style="color:#14532d;">${emailLinks.supportEmail()}</a>.`,
          BRAND_GREEN,
          "#F0F7F2",
          "#14532D",
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

  async sendPasswordResetConfirmation(
    to: string,
    name: string,
    role?: AppRole,
  ): Promise<void> {
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
            ${button("Log in to your account", emailLinks.login(role), BRAND_GREEN)}
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
            ${button("Go to wallet", emailLinks.buyerWallet(), BRAND_GREEN)}
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

  async sendOrderConfirmation(input: {
    to: string;
    buyerFirstName: string;
    buyerFullName: string;
    companyName?: string | null;
    orderReference: string;
    deliveryAddress: string;
    deliveryWindow?: string | null;
    placedAt?: Date;
    items: ReadonlyArray<{
      name: string;
      unitLabel: string;
      unit: string;
      quantity: number;
      unitPriceKobo: number;
      lineTotalKobo: number;
    }>;
    itemsTotalKobo: number;
    deliveryFeeKobo: number;
    serviceFeeKobo: number;
    totalKobo: number;
    /** Buyer-desk admin shown as the account manager on the receipt. */
    accountManager?: {
      name: string;
      phoneDisplay: string;
      phoneTel: string;
    } | null;
  }): Promise<void> {
    const {
      to,
      buyerFirstName,
      buyerFullName,
      companyName,
      orderReference,
      deliveryAddress,
      deliveryWindow,
      items,
      itemsTotalKobo,
      deliveryFeeKobo,
      serviceFeeKobo,
      totalKobo,
    } = input;

    const placedAt = input.placedAt ?? new Date();
    const whenLong = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Lagos",
    }).format(placedAt);
    const year = placedAt.getFullYear();
    const orderUrl = emailLinks.buyerOrder(orderReference);
    const logo = emailLinks.logo();
    const managerName =
      input.accountManager?.name || emailLinks.accountManagerName();
    const managerPhone =
      input.accountManager?.phoneDisplay ||
      emailLinks.accountManagerPhoneDisplay();
    const managerTel =
      input.accountManager?.phoneTel || emailLinks.accountManagerPhoneTel();
    const windowText =
      deliveryWindow?.trim() ||
      "We'll confirm your delivery window after payment clears";

    const deliverName = companyName?.trim() || buyerFullName;
    const unitWord = (qty: number, unit: string) => {
      const trimmed = unit.trim() || "unit";
      if (qty === 1) return trimmed;
      return /s$/i.test(trimmed) ? trimmed : `${trimmed}s`;
    };

    const itemRows = items
      .map((item, index) => {
        const border =
          index < items.length - 1 ? "border-bottom:1px solid #E8E8E3;" : "";
        return `
          <tr>
            <td style="padding:14px 0;${border};vertical-align:top;">
              <p style="margin:0 0 4px 0;font-size:15px;color:#1F2937;font-weight:500;">${item.name} — ${item.unitLabel}</p>
              <p style="margin:0;font-size:13px;color:#6B7280;">${item.quantity} ${unitWord(item.quantity, item.unit)} × ${formatNaira(item.unitPriceKobo)}</p>
            </td>
            <td style="padding:14px 0;${border};vertical-align:top;text-align:right;font-size:15px;color:#1F2937;white-space:nowrap;">${formatNaira(item.lineTotalKobo)}</td>
          </tr>
        `;
      })
      .join("");

    const serviceRow =
      serviceFeeKobo > 0
        ? `
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#374151;">Service fee</td>
            <td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;">${formatNaira(serviceFeeKobo)}</td>
          </tr>`
        : "";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed - Debridgers</title>
</head>
<body style="margin:0;padding:0;background:${OUTER_BG};font-family:Georgia,'Times New Roman',serif;color:#1F2937;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Debridgers order ${orderReference} is confirmed.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${OUTER_BG};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #E8E8E3;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 16px 32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:top;">
                    <img src="${logo}" alt="Debridgers" width="180" height="40" style="display:block;height:40px;width:auto;max-width:180px;border:0;outline:none;text-decoration:none;" />
                    <p style="margin:8px 0 0 0;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#9CA3AF;">Bulk food commodities · Kaduna</p>
                  </td>
                  <td align="right" style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#9CA3AF;font-weight:600;vertical-align:top;">Order receipt</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Green rule -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:2px;background:${BRAND_GREEN};line-height:2px;font-size:0;">&nbsp;</div>
            </td>
          </tr>

          <!-- Status banner -->
          <tr>
            <td style="padding:16px 32px;background:${ACCENT_BAR};font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND_GREEN};font-weight:700;">Order confirmed</td>
                  <td align="right" style="font-size:13px;color:#4B5563;">${whenLong}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <h1 style="margin:0 0 14px 0;font-size:28px;font-weight:700;color:#111827;line-height:1.25;">Your order is confirmed</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;font-family:Arial,Helvetica,sans-serif;">
                Thank you, ${buyerFirstName}. We've received your order
                <strong>${orderReference}</strong>. Complete payment to lock in delivery — once paid, we'll confirm your delivery window.
              </p>
            </td>
          </tr>

          <!-- Deliver to / window -->
          <tr>
            <td style="padding:20px 32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F6F4;border-collapse:collapse;">
                <tr>
                  <td style="padding:18px 20px;border-bottom:1px solid #E5E7EB;vertical-align:top;width:50%;">
                    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#9CA3AF;font-weight:700;">Deliver to</p>
                    <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111827;">${deliverName}</p>
                    <p style="margin:0 0 4px 0;font-size:13px;color:#4B5563;">${buyerFullName}</p>
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#4B5563;">${deliveryAddress}</p>
                  </td>
                  <td style="padding:18px 20px;border-bottom:1px solid #E5E7EB;border-left:1px solid #E5E7EB;vertical-align:top;width:50%;">
                    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#9CA3AF;font-weight:700;">Delivery window</p>
                    <p style="margin:0 0 10px 0;font-size:15px;font-weight:600;color:#111827;line-height:1.45;">${windowText}</p>
                    <p style="margin:0;font-size:13px;color:#6B7280;">Order no. ${orderReference}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Line items -->
          <tr>
            <td style="padding:8px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:0 0 8px 0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#9CA3AF;font-weight:700;border-bottom:1px solid #E8E8E3;">Commodity</td>
                  <td style="padding:0 0 8px 0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#9CA3AF;font-weight:700;text-align:right;border-bottom:1px solid #E8E8E3;">Amount</td>
                </tr>
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:8px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:10px 0 6px 0;font-size:14px;color:#374151;">Subtotal</td>
                  <td style="padding:10px 0 6px 0;font-size:14px;color:#374151;text-align:right;">${formatNaira(itemsTotalKobo)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#374151;">Delivery fee</td>
                  <td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;">${formatNaira(deliveryFeeKobo)}</td>
                </tr>
                ${serviceRow}
                <tr>
                  <td colspan="2" style="padding-top:10px;">
                    <div style="height:3px;background:${BRAND_GREEN};line-height:3px;font-size:0;">&nbsp;</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0 0;font-size:16px;font-weight:700;color:#111827;">Order total</td>
                  <td style="padding:14px 0 0 0;font-size:18px;font-weight:700;color:${BRAND_GREEN};text-align:right;">${formatNaira(totalKobo)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
              ${button("View order details", orderUrl)}
              <p style="margin:12px 0 0 0;font-size:13px;line-height:1.6;color:#6B7280;">
                Need to change quantities? Reply to this email before payment is confirmed.
              </p>
            </td>
          </tr>

          <!-- Account manager -->
          <tr>
            <td style="padding:20px 32px;font-family:Arial,Helvetica,sans-serif;">
              <div style="padding:14px 16px;background:#F5F6F4;border-left:4px solid ${BRAND_ORANGE};">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
                  Your account manager is <strong>${managerName}</strong> —
                  <a href="${managerTel}" style="color:${BRAND_GREEN};text-decoration:underline;">${managerPhone}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px 32px 32px;background:#F7F7F4;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #EFEFEA;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#6B7280;">
                ${emailLinks.companyAddressLine()}
              </p>
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#6B7280;">
                Feel free to ask questions
                <a href="mailto:${emailLinks.supportEmail()}" style="color:${BRAND_GREEN};text-decoration:none;">${emailLinks.supportEmail()}</a>
              </p>
              <p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;">
                <a href="${emailLinks.whatsapp()}" style="color:${BRAND_GREEN};text-decoration:none;">WhatsApp</a>
                <span style="color:#D1D5DB;"> · </span>
                <a href="${emailLinks.linkedin()}" style="color:${BRAND_GREEN};text-decoration:none;">LinkedIn</a>
              </p>
              <p style="margin:0;font-size:11px;color:#9CA3AF;">
                &copy; ${year} Debridgers. All rights reserved.
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

    await this.core.send({
      to,
      toName: buyerFullName,
      subject: `Order confirmed — ${orderReference}`,
      html,
    });
  }

  // === Admin Invite

  async sendAdminInvite(opts: {
    email: string;
    invite_code: string;
    temp_password?: string;
  }): Promise<void> {
    const dashboardUrl = emailLinks.adminLogin();

    const html = layout({
      headerBg: BRAND_ORANGE,
      outerBg: "#fff8ed",
      title: "Admin Invite - Debridgers",
      preheader:
        "You have been invited to manage Debridgers as a domain admin.",
      body: `
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Admin Invite</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hi, you have been invited to join DEBRIDGERS as a domain admin. Use the credentials and code below to complete your setup.
            </p>
          </td>
        </tr>
        ${button("Go to Dashboard", dashboardUrl, BRAND_ORANGE)}
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#111827;">Your Login Information:</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 16px 32px;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#111827;">Email:</p>
            <div style="display:inline-block;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-family:monospace;font-size:14px;letter-spacing:0.5px;color:#92400e;">
              ${opts.email}
            </div>
          </td>
        </tr>
        ${
          opts.temp_password
            ? `
        <tr>
          <td style="padding:0 32px 16px 32px;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#111827;">Temporary Password:</p>
            <div style="display:inline-block;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-family:monospace;font-size:14px;letter-spacing:1px;color:#92400e;">
              ${opts.temp_password}
            </div>
          </td>
        </tr>
        `
            : ""
        }
        <tr>
          <td style="padding:0 32px 16px 32px;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#111827;">Your Invite Code (32 characters):</p>
            <div style="display:inline-block;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-family:monospace;font-size:14px;letter-spacing:1px;color:#92400e;word-break:break-all;">
              ${opts.invite_code}
            </div>
          </td>
        </tr>
        ${infoBox(
          "<strong>Important:</strong> This invite code is valid for <strong>10 minutes only</strong>. Do not share this code with anyone. Save it securely.",
          BRAND_ORANGE,
          "#fffbeb",
          "#92400e",
        )}
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#374151;">
              <strong>Next steps:</strong><br/>
              1. Click "Go to Dashboard" above<br/>
              2. Log in with your email and temporary password<br/>
              3. Verify your invite code in the modal that appears<br/>
              4. Change your password (required within 2 minutes)
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
              Welcome to the team,<br/>
              <strong>The Debridgers Team</strong>
            </p>
          </td>
        </tr>
      `,
    });

    await this.core.send({
      to: opts.email,
      subject: "Admin Invite - Debridgers",
      html,
    });
  }

  // === HR recruitment

  async sendCareersJobPosted(opts: {
    to: string;
    title: string;
    department: string;
    location: string;
  }): Promise<void> {
    const html = layout({
      title: "Job posted",
      preheader: `${opts.title} is live on the careers board.`,
      badge: "Recruitment",
      eyebrow: "HR",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Job posted</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              <strong>${opts.title}</strong> (${opts.department}) in ${opts.location} is now open for applications.
            </p>
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      subject: `Job posted: ${opts.title}`,
      html,
    });
  }

  async sendCareersApplicationReceived(opts: {
    to: string;
    name: string;
    jobTitle: string;
  }): Promise<void> {
    const firstName = opts.name.split(/\s+/)[0] || opts.name;
    const html = layout({
      title: "Application received",
      preheader: `We received your application for ${opts.jobTitle}.`,
      badge: "Application received",
      eyebrow: "Careers",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Thank you, ${firstName}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              We received your application for <strong>${opts.jobTitle}</strong>. Our hiring team will review it and contact you if you are shortlisted.
            </p>
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      toName: opts.name,
      subject: `Application received — ${opts.jobTitle}`,
      html,
    });
  }

  async sendCareersApplicationRejected(opts: {
    to: string;
    name: string;
    jobTitle: string;
    feedback?: string;
  }): Promise<void> {
    const firstName = opts.name.split(/\s+/)[0] || opts.name;
    const feedbackBlock = opts.feedback
      ? `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">Feedback: ${opts.feedback}</p>`
      : "";
    const html = layout({
      title: "Application update",
      preheader: `Update on your application for ${opts.jobTitle}.`,
      badge: "Application update",
      eyebrow: "Careers",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Hello, ${firstName}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Thank you for applying for <strong>${opts.jobTitle}</strong>. We will not be moving forward with your application at this time.
            </p>
            ${feedbackBlock}
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              We wish you the best and encourage you to apply again when a matching role opens.
            </p>
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      toName: opts.name,
      subject: `Application update — ${opts.jobTitle}`,
      html,
    });
  }

  async sendCareersInterviewScheduled(opts: {
    to: string;
    name: string;
    jobTitle: string;
    scheduledAt: string;
    location: string;
    bookedBy?: "staff" | "applicant";
  }): Promise<void> {
    const firstName = opts.name.split(/\s+/)[0] || opts.name;
    const byApplicant = opts.bookedBy === "applicant";
    const html = layout({
      title: "Interview scheduled",
      preheader: `Interview for ${opts.jobTitle} on ${opts.scheduledAt}.`,
      badge: "Interview",
      eyebrow: "Careers",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">${byApplicant ? "Interview booked" : "Interview scheduled"}, ${firstName}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              ${
                byApplicant
                  ? `You booked an interview for <strong>${opts.jobTitle}</strong>.`
                  : `You are invited to interview for <strong>${opts.jobTitle}</strong>.`
              }
            </p>
            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#374151;"><strong>When:</strong> ${opts.scheduledAt}</p>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;"><strong>Where:</strong> ${opts.location}</p>
            ${button("Open applications", emailLinks.login("applicant"))}
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      toName: opts.name,
      subject: `Interview scheduled — ${opts.jobTitle}`,
      html,
    });
  }

  async sendCareersInterviewScheduledAdminNotice(opts: {
    to: string;
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    scheduledAt: string;
    location: string;
  }): Promise<void> {
    const html = layout({
      title: "Applicant booked interview",
      preheader: `${opts.applicantName} booked an interview for ${opts.jobTitle}.`,
      badge: "Interview",
      eyebrow: "Recruitment",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Interview booked by applicant</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              <strong>${opts.applicantName}</strong> (${opts.applicantEmail}) booked an interview for <strong>${opts.jobTitle}</strong>.
            </p>
            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#374151;"><strong>When:</strong> ${opts.scheduledAt}</p>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;"><strong>Where:</strong> ${opts.location}</p>
            ${button("Open recruitment", emailLinks.login("admin"))}
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      subject: `Interview booked — ${opts.jobTitle}`,
      html,
    });
  }

  async sendCareersOfferLetter(opts: {
    to: string;
    name: string;
    position: string;
    jobTitle: string;
    startDate: string;
    expiresAt: string;
    benefits?: string;
  }): Promise<void> {
    const firstName = opts.name.split(/\s+/)[0] || opts.name;
    const benefitsBlock = opts.benefits
      ? `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;"><strong>Benefits:</strong> ${opts.benefits}</p>`
      : "";
    const html = layout({
      title: "Job offer",
      preheader: `Offer for ${opts.position} at Debridgers.`,
      badge: "Offer",
      eyebrow: "Careers",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Congratulations, ${firstName}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              We are pleased to offer you the role of <strong>${opts.position}</strong> (${opts.jobTitle}).
            </p>
            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#374151;"><strong>Start date:</strong> ${opts.startDate}</p>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;"><strong>Offer expires:</strong> ${opts.expiresAt}</p>
            ${benefitsBlock}
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Log in to your applicant account to accept or decline this offer.
            </p>
            ${button("Open offers", emailLinks.login("applicant"))}
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      toName: opts.name,
      subject: `Job offer — ${opts.position}`,
      html,
    });
  }

  async sendCareersWelcomeEmployee(opts: {
    to: string;
    name: string;
    position: string;
    startDate: string;
  }): Promise<void> {
    const firstName = opts.name.split(/\s+/)[0] || opts.name;
    const html = layout({
      title: "Welcome to the team",
      preheader: `Welcome to Debridgers as ${opts.position}.`,
      badge: "Welcome",
      eyebrow: "People",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Welcome, ${firstName}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your offer for <strong>${opts.position}</strong> is accepted. Your account is now an employee account. Start date: <strong>${opts.startDate}</strong>.
            </p>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              HR will follow up with onboarding materials and your first-day checklist.
            </p>
            ${button("Open dashboard", emailLinks.login("employee"))}
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      toName: opts.name,
      subject: `Welcome to Debridgers — ${opts.position}`,
      html,
    });
  }

  // === HR people ops

  async sendCareersLeaveSubmitted(opts: {
    to: string;
    managerName: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }): Promise<void> {
    const html = layout({
      title: "Leave request",
      preheader: `${opts.employeeName} requested ${opts.leaveType} leave.`,
      badge: "Leave",
      eyebrow: "People",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Leave request</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hello ${opts.managerName}, <strong>${opts.employeeName}</strong> requested <strong>${opts.leaveType}</strong> leave from ${opts.startDate} to ${opts.endDate}.
            </p>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Review it in the HR leave inbox.
            </p>
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      subject: `Leave request — ${opts.employeeName}`,
      html,
    });
  }

  async sendCareersLeaveDecision(opts: {
    to: string;
    name: string;
    leaveType: string;
    status: "approved" | "rejected";
    notes?: string;
  }): Promise<void> {
    const firstName = opts.name.split(/\s+/)[0] || opts.name;
    const notes = opts.notes
      ? `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">Notes: ${opts.notes}</p>`
      : "";
    const html = layout({
      title: "Leave update",
      preheader: `Your ${opts.leaveType} leave was ${opts.status}.`,
      badge: "Leave",
      eyebrow: "People",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Hello, ${firstName}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your <strong>${opts.leaveType}</strong> leave request was <strong>${opts.status}</strong>.
            </p>
            ${notes}
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      toName: opts.name,
      subject: `Leave ${opts.status}`,
      html,
    });
  }

  async sendCareersWorkReportSubmitted(opts: {
    to: string;
    managerName: string;
    employeeName: string;
    periodType: string;
  }): Promise<void> {
    const html = layout({
      title: "Work report submitted",
      preheader: `${opts.employeeName} submitted a ${opts.periodType} work report.`,
      badge: "Work report",
      eyebrow: "People",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Work report to review</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Hello ${opts.managerName}, <strong>${opts.employeeName}</strong> submitted a <strong>${opts.periodType}</strong> work activity report.
            </p>
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      subject: `Work report — ${opts.employeeName}`,
      html,
    });
  }

  async sendCareersWorkReportDecision(opts: {
    to: string;
    name: string;
    status: "approved" | "rejected" | "revision_requested";
    notes?: string;
  }): Promise<void> {
    const firstName = opts.name.split(/\s+/)[0] || opts.name;
    const label =
      opts.status === "revision_requested" ? "revision requested" : opts.status;
    const notes = opts.notes
      ? `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">Notes: ${opts.notes}</p>`
      : "";
    const html = layout({
      title: "Work report update",
      preheader: `Your work report was ${label}.`,
      badge: "Work report",
      eyebrow: "People",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Hello, ${firstName}</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              Your work activity report was <strong>${label}</strong>.
            </p>
            ${notes}
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      toName: opts.name,
      subject: `Work report ${label}`,
      html,
    });
  }

  async sendCareersCriticalIncident(opts: {
    to: string;
    reporterName: string;
    category: string;
    description: string;
  }): Promise<void> {
    const html = layout({
      title: "Critical incident",
      preheader: `Critical ${opts.category} incident reported by ${opts.reporterName}.`,
      badge: "Incident",
      eyebrow: "People",
      body: `
        <tr>
          <td style="padding:20px 32px 8px 32px;">
            <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:700;color:#111827;">Critical incident reported</h2>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              <strong>${opts.reporterName}</strong> reported a critical <strong>${opts.category}</strong> incident.
            </p>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
              ${opts.description}
            </p>
          </td>
        </tr>
      `,
    });
    await this.core.send({
      to: opts.to,
      subject: `Critical incident — ${opts.category}`,
      html,
    });
  }
}
