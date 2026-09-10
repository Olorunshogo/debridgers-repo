import { z } from "zod";

export const updateMyEmployeeProfileSchema = z.object({
  phone: z.string().min(10).max(20).optional(),
  home_address: z.string().max(500).optional().nullable(),
  next_of_kin: z.string().max(500).optional().nullable(),
  emergency_contact: z.string().max(500).optional().nullable(),
  date_of_birth: z.string().datetime({ offset: true }).optional().nullable(),
});

export type UpdateMyEmployeeProfileDto = z.infer<
  typeof updateMyEmployeeProfileSchema
>;

export const updateEmployeeAdminSchema = z.object({
  job_title: z.string().min(1).max(200).optional(),
  department: z.string().min(1).max(120).optional(),
  manager_user_id: z.number().int().positive().optional().nullable(),
  employment_type: z
    .enum(["full_time", "part_time", "contract", "agent"])
    .optional(),
  status: z.enum(["active", "on_leave", "probation", "terminated"]).optional(),
  work_location: z.string().max(200).optional().nullable(),
  home_address: z.string().max(500).optional().nullable(),
  next_of_kin: z.string().max(500).optional().nullable(),
  emergency_contact: z.string().max(500).optional().nullable(),
  date_of_birth: z.string().datetime({ offset: true }).optional().nullable(),
});

export type UpdateEmployeeAdminDto = z.infer<typeof updateEmployeeAdminSchema>;

export const createLeaveRequestSchema = z
  .object({
    leave_type: z.enum(["annual", "sick", "compassionate", "personal"]),
    start_date: z.string().datetime({ offset: true }),
    end_date: z.string().datetime({ offset: true }),
    reason: z.string().min(3).max(5000),
    coverage_plan: z.string().max(5000).optional(),
  })
  .refine((d) => new Date(d.end_date) >= new Date(d.start_date), {
    message: "end_date must be on or after start_date",
    path: ["end_date"],
  });

export type CreateLeaveRequestDto = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewer_notes: z.string().max(5000).optional(),
});

export type ReviewLeaveRequestDto = z.infer<typeof reviewLeaveRequestSchema>;

export const upsertWorkReportSchema = z.object({
  period_type: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  period_start: z.string().datetime({ offset: true }),
  period_end: z.string().datetime({ offset: true }),
  tasks_completed: z.string().min(3).max(20000),
  milestones: z.string().max(10000).optional(),
  challenges: z.string().max(10000).optional(),
  next_steps: z.string().max(10000).optional(),
  submit: z.boolean().optional(),
});

export type UpsertWorkReportDto = z.infer<typeof upsertWorkReportSchema>;

export const reviewWorkReportSchema = z.object({
  status: z.enum(["approved", "rejected", "revision_requested"]),
  reviewer_notes: z.string().max(5000).optional(),
});

export type ReviewWorkReportDto = z.infer<typeof reviewWorkReportSchema>;
