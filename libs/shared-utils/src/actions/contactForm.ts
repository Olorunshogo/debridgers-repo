// "use server";

// import { z } from "zod";
// import { MailtrapClient } from "mailtrap";
// import { renderTemplate } from "~/lib/email-template";

// export interface ContactFormResult {
//   success: boolean;
//   message: string;
// }

// const MAILTRAP_SENDER_EMAIL = process.env.MAILTRAP_SENDER_EMAIL;
// const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;

// if (!MAILTRAP_SENDER_EMAIL) throw new Error("Missing MAILTRAP_SENDER_EMAIL env variable");
// if (!MAILTRAP_API_TOKEN) throw new Error("Missing MAILTRAP_API_TOKEN env variable");

// const mailtrap = new MailtrapClient({
//   token: MAILTRAP_API_TOKEN
// });

// const sender = {
//   name: "Debridgers Newsletter",
//   email: MAILTRAP_SENDER_EMAIL,
// };

// const adminRecipients = [
//   { email: "shownzy001@gmail.com" },
//   { email: "bamtefaolorunshogo12@gmail.com" },
// ]

// const contactFormSchema = z.object({
//   fullName: z.string().min(2, "Name must be at least 2 characters"),
//   email: z.string().email("Invalid email address"),
//   message: z.string().min(10, "Message must be at least 10 characters"),
// });

// export type ContactFormInput = z.infer<typeof contactFormSchema>;

// export async function submitContactForm( formData: FormData ): Promise<ContactFormResult> {
//   try {
//     const rawData = {
//       fullName: formData.get("fullName")?.toString().trim() ?? "",
//       email: formData.get("email")?.toString().trim() ?? "",
//       message: formData.get("message")?.toString().trim() ?? "",
//     };

//     const { fullName, email, message } = contactFormSchema.parse(rawData);

//     // 1. Send Admin Alert — "New Contact Form Message"
//     const adminHtml = renderTemplate("contact-form", {
//       name: fullName,
//       email,
//       message,
//     });

//     await mailtrap.send({
//       from: sender,
//       to: adminRecipients,
//       subject: `New Message from ${fullName} - Debrigger Contact Form`,
//       html: adminHtml,
//       text: `
//         New contact form submission:
//         \n\nName: ${fullName}
//         \nEmail: \n${email}
//         \n\nMessage: \n${message}
//       `,
//     })
//     .then(console.log)
//     .catch(console.error);

//     // 2. Send Welcome Auto-Response to User
//     const userHtml = renderTemplate("contact-form-auto-response", {
//       name: fullName,
//       message,
//     });

//     await mailtrap.send({
//       from: sender,
//       to: [{ email }],
//       subject: `We've received your message - Debrigger`,
//       html: userHtml,
//       text: `Hi ${fullName},\n\nThanks for contacting us! We’ll reply within 24 hours.\n\n— Debridgers Team`,
//     })
//     .then(console.log)
//     .catch(console.error);

//     return {
//       success: true,
//       message: "Message sent successfully! We'll get back to you soon.",
//     };
//   } catch (error: any) {
//     console.error("Contact form error: ", error);

//     return {
//       success: false,
//       message: error?.message || "Failed to send message. Please try again.",
//     };
//   }
// }
