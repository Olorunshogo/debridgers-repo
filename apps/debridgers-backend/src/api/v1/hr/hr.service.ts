import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { EmailService } from "../../../notification/features/email/email.service";
import type {
  CreateJobPostingDto,
  UpdateJobPostingDto,
} from "./dto/job-posting.dto";
import type { ApplyJobDto, ScreenApplicationDto } from "./dto/application.dto";
import type {
  InterviewFeedbackDto,
  ScheduleInterviewDto,
} from "./dto/interview.dto";
import type { CreateOfferDto } from "./dto/offer.dto";

@Injectable()
export class HrService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly email: EmailService,
  ) {}

  // === Jobs (public)

  async listOpenJobs() {
    return this.db
      .select()
      .from(schema.hrJobPostings)
      .where(
        and(
          eq(schema.hrJobPostings.status, "open"),
          isNull(schema.hrJobPostings.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrJobPostings.created_at));
  }

  async getJob(jobId: number) {
    const [job] = await this.db
      .select()
      .from(schema.hrJobPostings)
      .where(
        and(
          eq(schema.hrJobPostings.id, jobId),
          isNull(schema.hrJobPostings.deleted_at),
        ),
      )
      .limit(1);
    if (!job) {
      throw new NotFoundException("Job posting not found");
    }
    return job;
  }

  // === Jobs (HR)

  async listJobsForHr() {
    return this.db
      .select()
      .from(schema.hrJobPostings)
      .where(isNull(schema.hrJobPostings.deleted_at))
      .orderBy(desc(schema.hrJobPostings.created_at));
  }

  async createJob(dto: CreateJobPostingDto, actor: JwtPayload) {
    const [job] = await this.db
      .insert(schema.hrJobPostings)
      .values({
        title: dto.title,
        department: dto.department,
        location: dto.location,
        description: dto.description,
        requirements: dto.requirements,
        salary_min_kobo: dto.salary_min_kobo ?? null,
        salary_max_kobo: dto.salary_max_kobo ?? null,
        created_by: actor.sub,
        status: "open",
      })
      .returning();

    void this.email
      .sendHrJobPosted({
        to: actor.email,
        title: job.title,
        department: job.department,
        location: job.location,
      })
      .catch(() => undefined);

    return job;
  }

  async updateJob(jobId: number, dto: UpdateJobPostingDto) {
    await this.getJob(jobId);
    const [updated] = await this.db
      .update(schema.hrJobPostings)
      .set({
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.department !== undefined ? { department: dto.department } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.requirements !== undefined
          ? { requirements: dto.requirements }
          : {}),
        ...(dto.salary_min_kobo !== undefined
          ? { salary_min_kobo: dto.salary_min_kobo }
          : {}),
        ...(dto.salary_max_kobo !== undefined
          ? { salary_max_kobo: dto.salary_max_kobo }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        updated_at: new Date(),
      })
      .where(eq(schema.hrJobPostings.id, jobId))
      .returning();
    return updated;
  }

  // === Apply

  async apply(jobId: number, dto: ApplyJobDto, cvUrl?: string) {
    const job = await this.getJob(jobId);
    if (job.status !== "open") {
      throw new BadRequestException("This job is not open for applications");
    }

    const email = dto.email.toLowerCase();
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, email))
      .limit(1);

    let userId: number;
    if (existing) {
      if (existing.role !== "applicant") {
        throw new ConflictException({
          message: "Email already registered under another role",
          errors: [
            {
              field: "email",
              message:
                "This email already has a Debridgers account. Use a different email to apply, or contact HR.",
            },
          ],
        });
      }
      userId = existing.id;
      if (!existing.is_email_verified) {
        await this.db
          .update(schema.users)
          .set({ is_email_verified: true, updated_at: new Date() })
          .where(eq(schema.users.id, existing.id));
      }
    } else {
      const hashed = await bcrypt.hash(dto.password, 12);
      const [created] = await this.db
        .insert(schema.users)
        .values({
          first_name: dto.first_name,
          last_name: dto.last_name,
          email,
          phone: dto.phone,
          password: hashed,
          role: "applicant",
          // Apply already proved email ownership for this hiring path; blocking
          // login behind a second OTP stopped applicants reaching their dashboard.
          is_email_verified: true,
        })
        .returning();
      userId = created.id;
    }

    const [dup] = await this.db
      .select({ id: schema.hrApplications.id })
      .from(schema.hrApplications)
      .where(
        and(
          eq(schema.hrApplications.job_id, jobId),
          eq(schema.hrApplications.user_id, userId),
          isNull(schema.hrApplications.deleted_at),
        ),
      )
      .limit(1);
    if (dup) {
      throw new ConflictException("You have already applied for this job");
    }

    const [application] = await this.db
      .insert(schema.hrApplications)
      .values({
        job_id: jobId,
        user_id: userId,
        first_name: dto.first_name,
        last_name: dto.last_name,
        email,
        phone: dto.phone,
        cv_url: cvUrl ?? null,
        cover_letter: dto.cover_letter ?? null,
        status: "received",
      })
      .returning();

    const name = `${dto.first_name} ${dto.last_name}`.trim();
    void this.email
      .sendHrApplicationReceived({ to: email, name, jobTitle: job.title })
      .catch(() => undefined);

    return { application, job };
  }

  async listApplications(jobId?: number) {
    if (jobId != null) {
      return this.db
        .select()
        .from(schema.hrApplications)
        .where(
          and(
            eq(schema.hrApplications.job_id, jobId),
            isNull(schema.hrApplications.deleted_at),
          ),
        )
        .orderBy(desc(schema.hrApplications.created_at));
    }
    return this.db
      .select()
      .from(schema.hrApplications)
      .where(isNull(schema.hrApplications.deleted_at))
      .orderBy(desc(schema.hrApplications.created_at));
  }

  async listMyApplications(actor: JwtPayload) {
    const rows = await this.db
      .select({
        application: schema.hrApplications,
        job: schema.hrJobPostings,
      })
      .from(schema.hrApplications)
      .innerJoin(
        schema.hrJobPostings,
        eq(schema.hrApplications.job_id, schema.hrJobPostings.id),
      )
      .where(
        and(
          eq(schema.hrApplications.user_id, actor.sub),
          isNull(schema.hrApplications.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrApplications.created_at));

    if (rows.length === 0) return rows.map((r) => ({ ...r, interview: null }));

    const appIds = rows.map((r) => r.application.id);
    const interviews = await this.db
      .select()
      .from(schema.hrInterviews)
      .where(
        and(
          inArray(schema.hrInterviews.application_id, appIds),
          isNull(schema.hrInterviews.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrInterviews.scheduled_at));

    const latestByApp = new Map<number, (typeof interviews)[number]>();
    for (const interview of interviews) {
      if (!latestByApp.has(interview.application_id)) {
        latestByApp.set(interview.application_id, interview);
      }
    }

    return rows.map((r) => ({
      ...r,
      interview: latestByApp.get(r.application.id) ?? null,
    }));
  }

  async listMyOffers(actor: JwtPayload) {
    return this.db
      .select({
        offer: schema.hrOffers,
        application: schema.hrApplications,
        job: schema.hrJobPostings,
      })
      .from(schema.hrOffers)
      .innerJoin(
        schema.hrApplications,
        eq(schema.hrOffers.application_id, schema.hrApplications.id),
      )
      .innerJoin(
        schema.hrJobPostings,
        eq(schema.hrApplications.job_id, schema.hrJobPostings.id),
      )
      .where(
        and(
          eq(schema.hrApplications.user_id, actor.sub),
          isNull(schema.hrOffers.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrOffers.created_at));
  }

  async screenApplication(applicationId: number, dto: ScreenApplicationDto) {
    const application = await this.requireApplication(applicationId);
    const [updated] = await this.db
      .update(schema.hrApplications)
      .set({
        status: dto.status,
        notes: dto.notes ?? application.notes,
        updated_at: new Date(),
      })
      .where(eq(schema.hrApplications.id, applicationId))
      .returning();

    if (dto.status === "rejected") {
      const job = await this.getJob(application.job_id);
      void this.email
        .sendHrApplicationRejected({
          to: application.email,
          name: `${application.first_name} ${application.last_name}`.trim(),
          jobTitle: job.title,
          feedback: dto.rejection_feedback,
        })
        .catch(() => undefined);
    }

    return updated;
  }

  // === Interviews

  async scheduleInterview(applicationId: number, dto: ScheduleInterviewDto) {
    return this.insertOrRescheduleInterview(applicationId, dto, "staff");
  }

  async scheduleInterviewAsApplicant(
    applicationId: number,
    dto: ScheduleInterviewDto,
    actor: JwtPayload,
  ) {
    const application = await this.requireApplication(applicationId);
    if (application.user_id !== actor.sub) {
      throw new ForbiddenException("You can only schedule your own interview");
    }
    if (
      application.status !== "received" &&
      application.status !== "screening" &&
      application.status !== "passed"
    ) {
      throw new BadRequestException(
        "This application can no longer schedule an interview",
      );
    }
    return this.insertOrRescheduleInterview(applicationId, dto, "applicant");
  }

  private async insertOrRescheduleInterview(
    applicationId: number,
    dto: ScheduleInterviewDto,
    bookedBy: "staff" | "applicant",
  ) {
    const application = await this.requireApplication(applicationId);
    if (
      bookedBy === "staff" &&
      application.status !== "passed" &&
      application.status !== "screening" &&
      application.status !== "received"
    ) {
      throw new BadRequestException(
        "Cannot schedule an interview for a rejected application",
      );
    }

    const scheduledAt = new Date(dto.scheduled_at);
    if (
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getTime() < Date.now()
    ) {
      throw new BadRequestException({
        message: "Pick a future interview time",
        errors: [{ field: "scheduled_at", message: "Must be in the future" }],
      });
    }

    const [existing] = await this.db
      .select()
      .from(schema.hrInterviews)
      .where(
        and(
          eq(schema.hrInterviews.application_id, applicationId),
          eq(schema.hrInterviews.status, "scheduled"),
          isNull(schema.hrInterviews.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrInterviews.scheduled_at))
      .limit(1);

    let interview;
    if (existing) {
      const [updated] = await this.db
        .update(schema.hrInterviews)
        .set({
          scheduled_at: scheduledAt,
          location: dto.location,
          interviewer_user_id:
            dto.interviewer_user_id ?? existing.interviewer_user_id,
          status: "scheduled",
          updated_at: new Date(),
        })
        .where(eq(schema.hrInterviews.id, existing.id))
        .returning();
      interview = updated;
    } else {
      const [created] = await this.db
        .insert(schema.hrInterviews)
        .values({
          application_id: applicationId,
          scheduled_at: scheduledAt,
          location: dto.location,
          interviewer_user_id: dto.interviewer_user_id ?? null,
          status: "scheduled",
        })
        .returning();
      interview = created;
    }

    if (application.status !== "passed") {
      await this.db
        .update(schema.hrApplications)
        .set({ status: "passed", updated_at: new Date() })
        .where(eq(schema.hrApplications.id, applicationId));
    }

    const job = await this.getJob(application.job_id);
    const applicantName =
      `${application.first_name} ${application.last_name}`.trim();
    void this.email
      .sendHrInterviewScheduled({
        to: application.email,
        name: applicantName,
        jobTitle: job.title,
        scheduledAt: scheduledAt.toISOString(),
        location: dto.location,
        bookedBy,
      })
      .catch(() => undefined);

    const adminEmail = process.env.ADMIN_EMAIL;
    if (bookedBy === "applicant" && adminEmail) {
      void this.email
        .sendHrInterviewScheduledAdminNotice({
          to: adminEmail,
          applicantName,
          applicantEmail: application.email,
          jobTitle: job.title,
          scheduledAt: scheduledAt.toISOString(),
          location: dto.location,
        })
        .catch(() => undefined);
    }

    return interview;
  }

  async updateInterview(interviewId: number, dto: InterviewFeedbackDto) {
    const [interview] = await this.db
      .select()
      .from(schema.hrInterviews)
      .where(
        and(
          eq(schema.hrInterviews.id, interviewId),
          isNull(schema.hrInterviews.deleted_at),
        ),
      )
      .limit(1);
    if (!interview) {
      throw new NotFoundException("Interview not found");
    }

    const [updated] = await this.db
      .update(schema.hrInterviews)
      .set({
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.technical_score !== undefined
          ? { technical_score: dto.technical_score }
          : {}),
        ...(dto.culture_fit !== undefined
          ? { culture_fit: dto.culture_fit }
          : {}),
        ...(dto.feedback !== undefined ? { feedback: dto.feedback } : {}),
        ...(dto.scheduled_at !== undefined
          ? { scheduled_at: new Date(dto.scheduled_at) }
          : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        updated_at: new Date(),
      })
      .where(eq(schema.hrInterviews.id, interviewId))
      .returning();
    return updated;
  }

  // === Offers

  async createOffer(
    applicationId: number,
    dto: CreateOfferDto,
    actor: JwtPayload,
  ) {
    const application = await this.requireApplication(applicationId);
    const startDate = new Date(dto.start_date);
    const expiresAt = new Date(dto.expires_at);
    if (expiresAt <= new Date()) {
      throw new BadRequestException("expires_at must be in the future");
    }

    const engagement = dto.engagement ?? "team";
    const salaryLine =
      engagement === "team"
        ? `Salary (kobo): ${dto.salary_kobo}`
        : `Engagement: ${engagement} (unpaid)`;
    const engagementTag = `Engagement: ${engagement}`;
    const benefits = [engagementTag, dto.benefits?.trim() || null]
      .filter(Boolean)
      .join("\n");
    const letter = [
      `Position: ${dto.position}`,
      engagementTag,
      salaryLine,
      `Start date: ${startDate.toISOString().slice(0, 10)}`,
      `Offer expires: ${expiresAt.toISOString().slice(0, 10)}`,
      dto.benefits ? `Benefits: ${dto.benefits}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const [offer] = await this.db
      .insert(schema.hrOffers)
      .values({
        application_id: applicationId,
        position: dto.position,
        salary_kobo: dto.salary_kobo,
        start_date: startDate,
        expires_at: expiresAt,
        benefits,
        status: "sent",
        letter_snapshot: letter,
      })
      .returning();

    const job = await this.getJob(application.job_id);
    void this.email
      .sendHrOfferLetter({
        to: application.email,
        name: `${application.first_name} ${application.last_name}`.trim(),
        position: dto.position,
        jobTitle: job.title,
        startDate: startDate.toISOString().slice(0, 10),
        expiresAt: expiresAt.toISOString().slice(0, 10),
        benefits: dto.benefits,
      })
      .catch(() => undefined);

    // Track a contract signing slot for the dashboard; URL filled when HR uploads
    // or Jotform Sign webhook completes.
    await this.db.insert(schema.hrSignRequests).values({
      kind: "contract",
      status: "pending",
      subject_user_id: application.user_id,
      application_id: applicationId,
      title: `Employment contract — ${dto.position}`,
      created_by: actor.sub,
    });

    return offer;
  }

  async acceptOffer(offerId: number, actor: JwtPayload) {
    return this.finalizeOffer(offerId, "accepted", actor);
  }

  async rejectOffer(offerId: number, actor: JwtPayload) {
    return this.finalizeOffer(offerId, "rejected", actor);
  }

  /** HR may mark accept without the applicant JWT (phone confirmation). */
  async hrAcceptOffer(offerId: number) {
    return this.finalizeOffer(offerId, "accepted", null);
  }

  private async finalizeOffer(
    offerId: number,
    outcome: "accepted" | "rejected",
    actor: JwtPayload | null,
  ) {
    const [offer] = await this.db
      .select()
      .from(schema.hrOffers)
      .where(
        and(
          eq(schema.hrOffers.id, offerId),
          isNull(schema.hrOffers.deleted_at),
        ),
      )
      .limit(1);
    if (!offer) {
      throw new NotFoundException("Offer not found");
    }
    if (offer.status !== "sent") {
      throw new BadRequestException(`Offer is already ${offer.status}`);
    }
    if (offer.expires_at < new Date()) {
      await this.db
        .update(schema.hrOffers)
        .set({ status: "expired", updated_at: new Date() })
        .where(eq(schema.hrOffers.id, offerId));
      throw new BadRequestException("Offer has expired");
    }

    const application = await this.requireApplication(offer.application_id);
    if (actor && actor.sub !== application.user_id) {
      throw new ForbiddenException("This offer does not belong to you");
    }

    if (outcome === "rejected") {
      const [updated] = await this.db
        .update(schema.hrOffers)
        .set({ status: "rejected", updated_at: new Date() })
        .where(eq(schema.hrOffers.id, offerId))
        .returning();
      return { offer: updated, employee: null };
    }

    const job = await this.getJob(application.job_id);

    const result = await this.db.transaction(async (tx) => {
      const [updatedOffer] = await tx
        .update(schema.hrOffers)
        .set({ status: "accepted", updated_at: new Date() })
        .where(eq(schema.hrOffers.id, offerId))
        .returning();

      await tx
        .update(schema.users)
        .set({ role: "employee", updated_at: new Date() })
        .where(eq(schema.users.id, application.user_id));

      const [employee] = await tx
        .insert(schema.hrEmployees)
        .values({
          user_id: application.user_id,
          application_id: application.id,
          job_title: offer.position,
          department: job.department,
          start_date: offer.start_date,
          employment_type: this.employmentTypeFromOffer(offer),
          status: "probation",
        })
        .returning();

      await tx
        .update(schema.hrJobPostings)
        .set({ status: "filled", updated_at: new Date() })
        .where(eq(schema.hrJobPostings.id, job.id));

      return { offer: updatedOffer, employee };
    });

    void this.email
      .sendHrWelcomeEmployee({
        to: application.email,
        name: `${application.first_name} ${application.last_name}`.trim(),
        position: offer.position,
        startDate: offer.start_date.toISOString().slice(0, 10),
      })
      .catch(() => undefined);

    return result;
  }

  async getApplication(applicationId: number) {
    return this.requireApplication(applicationId);
  }

  private employmentTypeFromOffer(offer: {
    salary_kobo: number;
    benefits: string | null;
  }): "full_time" | "part_time" | "contract" | "agent" {
    const match = offer.benefits?.match(
      /Engagement:\s*(team|intern|volunteer)/i,
    );
    const engagement = (match?.[1] ?? "").toLowerCase();
    if (engagement === "intern") return "contract";
    if (engagement === "volunteer") return "part_time";
    if (engagement === "team" || offer.salary_kobo > 0) return "full_time";
    return "contract";
  }

  private async requireApplication(applicationId: number) {
    const [application] = await this.db
      .select()
      .from(schema.hrApplications)
      .where(
        and(
          eq(schema.hrApplications.id, applicationId),
          isNull(schema.hrApplications.deleted_at),
        ),
      )
      .limit(1);
    if (!application) {
      throw new NotFoundException("Application not found");
    }
    return application;
  }
}
