import { z } from "zod";

export const scheduleInterviewSchema = z.object({
  scheduled_at: z.string().datetime({ offset: true }),
  location: z.string().min(2).max(500),
  interviewer_user_id: z.number().int().positive().optional().nullable(),
});

export type ScheduleInterviewDto = z.infer<typeof scheduleInterviewSchema>;

export const interviewFeedbackSchema = z.object({
  status: z.enum(["completed", "no_show", "rescheduled"]).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  technical_score: z.number().int().min(1).max(5).optional(),
  culture_fit: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(5000).optional(),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  location: z.string().min(2).max(500).optional(),
});

export type InterviewFeedbackDto = z.infer<typeof interviewFeedbackSchema>;
