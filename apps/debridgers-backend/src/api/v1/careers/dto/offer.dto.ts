import { z } from "zod";

/*
 * engagement drives pay: team is paid (salary required); intern and volunteer
 * are unpaid for now (salary_kobo 0). Maps onto hr_employment_type on accept.
 */
export const createOfferSchema = z
  .object({
    position: z.string().min(2).max(200),
    engagement: z.enum(["team", "intern", "volunteer"]).default("team"),
    salary_kobo: z.number().int().nonnegative(),
    start_date: z.string().datetime({ offset: true }),
    expires_at: z.string().datetime({ offset: true }),
    benefits: z.string().max(5000).optional(),
    employment_type: z
      .enum(["full_time", "part_time", "contract", "agent"])
      .optional(),
    department: z.string().min(1).max(120).optional(),
    manager_user_id: z.number().int().positive().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.engagement === "team" && data.salary_kobo <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_kobo"],
        message: "Monthly salary is required for team roles",
      });
    }
    if (data.engagement !== "team" && data.salary_kobo !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_kobo"],
        message: "Unpaid tracks must send salary_kobo 0",
      });
    }
  });

export type CreateOfferDto = z.infer<typeof createOfferSchema>;
