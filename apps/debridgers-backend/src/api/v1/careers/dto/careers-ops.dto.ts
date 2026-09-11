import { z } from "zod";

export const createPerformanceReviewSchema = z.object({
  employee_user_id: z.number().int().positive(),
  review_type: z.enum(["annual", "probation"]).default("annual"),
  due_at: z.string().datetime({ offset: true }),
  manager_user_id: z.number().int().positive().optional().nullable(),
});

export type CreatePerformanceReviewDto = z.infer<
  typeof createPerformanceReviewSchema
>;

export const selfAssessmentSchema = z.object({
  self_achievements: z.string().min(3).max(20000),
  self_learnings: z.string().max(20000).optional(),
  self_goals_met: z.string().max(20000).optional(),
  self_improvements: z.string().max(20000).optional(),
  self_next_goals: z.string().max(20000).optional(),
});

export type SelfAssessmentDto = z.infer<typeof selfAssessmentSchema>;

export const managerReviewSchema = z.object({
  manager_goals_met: z.boolean(),
  manager_rating: z.number().int().min(1).max(5),
  manager_feedback: z.string().max(20000).optional(),
  probation_decision: z.enum(["confirm", "terminate"]).optional(),
});

export type ManagerReviewDto = z.infer<typeof managerReviewSchema>;

export const createPipSchema = z.object({
  employee_user_id: z.number().int().positive(),
  goals: z.string().min(3),
  timelines: z.string().min(3),
  support: z.string().optional(),
  success_criteria: z.string().min(3),
  due_at: z.string().datetime({ offset: true }),
});

export type CreatePipDto = z.infer<typeof createPipSchema>;

export const closePipSchema = z.object({
  status: z.enum(["passed", "failed"]),
  outcome_notes: z.string().max(10000).optional(),
});

export type ClosePipDto = z.infer<typeof closePipSchema>;

export const createExpenseSchema = z.object({
  description: z.string().min(3).max(5000),
  amount_kobo: z.number().int().positive(),
  expense_date: z.string().datetime({ offset: true }),
  category: z.enum([
    "travel",
    "meals",
    "materials",
    "client_entertainment",
    "other",
  ]),
});

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;

export const reviewExpenseSchema = z.object({
  status: z.enum([
    "manager_approved",
    "admin_approved",
    "rejected",
    "reimbursed",
  ]),
  reviewer_notes: z.string().max(5000).optional(),
});

export type ReviewExpenseDto = z.infer<typeof reviewExpenseSchema>;

export const createIncidentSchema = z.object({
  occurred_at: z.string().datetime({ offset: true }),
  description: z.string().min(3),
  people_involved: z.string().optional(),
  impact: z.string().optional(),
  corrective_actions: z.string().optional(),
  category: z.enum(["safety", "hr_issue", "conflict", "damage", "other"]),
  critical: z.boolean().optional(),
});

export type CreateIncidentDto = z.infer<typeof createIncidentSchema>;

export const updateIncidentSchema = z.object({
  status: z.enum(["reported", "under_investigation", "resolved", "closed"]),
  assignee_user_id: z.number().int().positive().optional().nullable(),
  corrective_actions: z.string().optional(),
});

export type UpdateIncidentDto = z.infer<typeof updateIncidentSchema>;

export const createProjectReportSchema = z.object({
  project_name: z.string().min(2).max(200),
  progress_pct: z.number().int().min(0).max(100),
  completed_items: z.string().optional(),
  blockers: z.string().optional(),
  next_steps: z.string().optional(),
  submit: z.boolean().optional(),
});

export type CreateProjectReportDto = z.infer<typeof createProjectReportSchema>;

export const reviewProjectReportSchema = z.object({
  status: z.enum(["approved"]),
});

export type ReviewProjectReportDto = z.infer<typeof reviewProjectReportSchema>;

export const createPolicySchema = z.object({
  title: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  body: z.string().min(10),
  document_url: z.string().url().optional().nullable(),
  version: z.string().min(1).max(32).default("1.0"),
  effective_at: z.string().datetime({ offset: true }),
  restricted: z.boolean().optional(),
});

export type CreatePolicyDto = z.infer<typeof createPolicySchema>;

export const createSignRequestSchema = z.object({
  kind: z.enum(["offer", "contract", "policy"]),
  subject_user_id: z.number().int().positive(),
  title: z.string().min(2).max(200),
  sign_url: z.string().url().optional(),
  application_id: z.number().int().positive().optional().nullable(),
  policy_id: z.number().int().positive().optional().nullable(),
  metadata: z.string().optional(),
});

export type CreateSignRequestDto = z.infer<typeof createSignRequestSchema>;

export const uploadEmployeeDocsSchema = z.object({
  nin: z.string().max(32).optional().nullable(),
  tax_id: z.string().max(64).optional().nullable(),
  bank_account: z.string().max(500).optional().nullable(),
});

export type UploadEmployeeDocsDto = z.infer<typeof uploadEmployeeDocsSchema>;

export const signWebhookSchema = z.object({
  external_id: z.string().min(1).optional(),
  sign_request_id: z.number().int().positive().optional(),
  status: z.enum(["signed", "declined", "expired"]),
  signed_document_url: z.string().url().optional(),
});

export type SignWebhookDto = z.infer<typeof signWebhookSchema>;
