import { z } from "zod";

const jobPostingFields = z.object({
  title: z.string().min(2).max(200),
  department: z.string().min(1).max(120),
  location: z.string().min(1).max(200),
  description: z.string().min(10),
  requirements: z.string().min(10),
  salary_min_kobo: z.number().int().nonnegative().optional().nullable(),
  salary_max_kobo: z.number().int().nonnegative().optional().nullable(),
});

const salaryRangeOk = (data: {
  salary_min_kobo?: number | null;
  salary_max_kobo?: number | null;
}) =>
  data.salary_min_kobo == null ||
  data.salary_max_kobo == null ||
  data.salary_min_kobo <= data.salary_max_kobo;

export const createJobPostingSchema = jobPostingFields.refine(salaryRangeOk, {
  message: "salary_min_kobo must be <= salary_max_kobo",
  path: ["salary_max_kobo"],
});

export type CreateJobPostingDto = z.infer<typeof createJobPostingSchema>;

export const updateJobPostingSchema = jobPostingFields
  .partial()
  .extend({
    status: z.enum(["open", "closed", "filled"]).optional(),
  })
  .refine(salaryRangeOk, {
    message: "salary_min_kobo must be <= salary_max_kobo",
    path: ["salary_max_kobo"],
  });

export type UpdateJobPostingDto = z.infer<typeof updateJobPostingSchema>;
