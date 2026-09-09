import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { EmailService } from "../../../notification/features/email/email.service";
import type {
  ClosePipDto,
  CreateExpenseDto,
  CreateIncidentDto,
  CreatePerformanceReviewDto,
  CreatePipDto,
  CreatePolicyDto,
  CreateProjectReportDto,
  CreateSignRequestDto,
  ManagerReviewDto,
  ReviewExpenseDto,
  SelfAssessmentDto,
  UpdateIncidentDto,
  UploadEmployeeDocsDto,
} from "./dto/hr-ops.dto";

const HR_ROLES = new Set(["admin", "hr"]);
const HIRING_ROLES = new Set(["admin"]);

@Injectable()
export class HrOpsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly email: EmailService,
  ) {}

  private isHr(actor: JwtPayload) {
    return HR_ROLES.has(actor.role);
  }

  private isHiringStaff(actor: JwtPayload) {
    return HIRING_ROLES.has(actor.role);
  }

  // === Performance reviews

  async createReview(actor: JwtPayload, dto: CreatePerformanceReviewDto) {
    if (!this.isHr(actor)) {
      await this.assertManagerOrHr(actor, dto.employee_user_id);
    }
    const [row] = await this.db
      .insert(schema.hrPerformanceReviews)
      .values({
        employee_user_id: dto.employee_user_id,
        manager_user_id: dto.manager_user_id ?? actor.sub,
        review_type: dto.review_type,
        due_at: new Date(dto.due_at),
        status: "pending_self",
      })
      .returning();
    return row;
  }

  async submitSelfAssessment(
    reviewId: number,
    actor: JwtPayload,
    dto: SelfAssessmentDto,
  ) {
    const review = await this.requireReview(reviewId);
    if (review.employee_user_id !== actor.sub) {
      throw new ForbiddenException("Not your review");
    }
    if (review.status !== "pending_self") {
      throw new BadRequestException("Self-assessment already submitted");
    }
    const [updated] = await this.db
      .update(schema.hrPerformanceReviews)
      .set({
        self_achievements: dto.self_achievements,
        self_learnings: dto.self_learnings ?? null,
        self_goals_met: dto.self_goals_met ?? null,
        self_improvements: dto.self_improvements ?? null,
        self_next_goals: dto.self_next_goals ?? null,
        self_submitted_at: new Date(),
        status: "pending_manager",
        updated_at: new Date(),
      })
      .where(eq(schema.hrPerformanceReviews.id, reviewId))
      .returning();
    return updated;
  }

  async submitManagerReview(
    reviewId: number,
    actor: JwtPayload,
    dto: ManagerReviewDto,
  ) {
    const review = await this.requireReview(reviewId);
    if (!this.isHr(actor) && review.manager_user_id !== actor.sub) {
      throw new ForbiddenException("Not the reviewing manager");
    }
    if (review.status !== "pending_manager") {
      throw new BadRequestException("Review is not awaiting manager input");
    }
    if (review.review_type === "probation" && !dto.probation_decision) {
      throw new BadRequestException(
        "probation_decision required for probation reviews",
      );
    }

    const [updated] = await this.db
      .update(schema.hrPerformanceReviews)
      .set({
        manager_goals_met: dto.manager_goals_met,
        manager_rating: dto.manager_rating,
        manager_feedback: dto.manager_feedback ?? null,
        manager_submitted_at: new Date(),
        probation_decision: dto.probation_decision ?? null,
        status: "completed",
        updated_at: new Date(),
      })
      .where(eq(schema.hrPerformanceReviews.id, reviewId))
      .returning();

    if (
      review.review_type === "probation" &&
      dto.probation_decision === "confirm"
    ) {
      await this.db
        .update(schema.hrEmployees)
        .set({ status: "active", updated_at: new Date() })
        .where(eq(schema.hrEmployees.user_id, review.employee_user_id));
    }
    if (
      review.review_type === "probation" &&
      dto.probation_decision === "terminate"
    ) {
      await this.db
        .update(schema.hrEmployees)
        .set({ status: "terminated", updated_at: new Date() })
        .where(eq(schema.hrEmployees.user_id, review.employee_user_id));
    }

    return updated;
  }

  async listReviews(actor: JwtPayload) {
    if (this.isHr(actor)) {
      return this.db
        .select()
        .from(schema.hrPerformanceReviews)
        .where(isNull(schema.hrPerformanceReviews.deleted_at))
        .orderBy(desc(schema.hrPerformanceReviews.due_at));
    }
    return this.db
      .select()
      .from(schema.hrPerformanceReviews)
      .where(
        and(
          orEqEmployeeOrManager(schema.hrPerformanceReviews, actor.sub),
          isNull(schema.hrPerformanceReviews.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrPerformanceReviews.due_at));
  }

  async createPip(actor: JwtPayload, dto: CreatePipDto) {
    if (!this.isHr(actor)) {
      await this.assertManagerOrHr(actor, dto.employee_user_id);
    }
    const [row] = await this.db
      .insert(schema.hrPerformancePlans)
      .values({
        employee_user_id: dto.employee_user_id,
        manager_user_id: actor.sub,
        goals: dto.goals,
        timelines: dto.timelines,
        support: dto.support ?? null,
        success_criteria: dto.success_criteria,
        due_at: new Date(dto.due_at),
        status: "active",
      })
      .returning();
    return row;
  }

  async closePip(pipId: number, actor: JwtPayload, dto: ClosePipDto) {
    const [pip] = await this.db
      .select()
      .from(schema.hrPerformancePlans)
      .where(
        and(
          eq(schema.hrPerformancePlans.id, pipId),
          isNull(schema.hrPerformancePlans.deleted_at),
        ),
      )
      .limit(1);
    if (!pip) throw new NotFoundException("PIP not found");
    if (!this.isHr(actor) && pip.manager_user_id !== actor.sub) {
      throw new ForbiddenException();
    }
    const [updated] = await this.db
      .update(schema.hrPerformancePlans)
      .set({
        status: dto.status,
        outcome_notes: dto.outcome_notes ?? null,
        closed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.hrPerformancePlans.id, pipId))
      .returning();
    return updated;
  }

  async listPips(actor: JwtPayload) {
    if (this.isHr(actor)) {
      return this.db
        .select()
        .from(schema.hrPerformancePlans)
        .where(isNull(schema.hrPerformancePlans.deleted_at))
        .orderBy(desc(schema.hrPerformancePlans.due_at));
    }
    return this.db
      .select()
      .from(schema.hrPerformancePlans)
      .where(
        and(
          sql`(${schema.hrPerformancePlans.employee_user_id} = ${actor.sub} or ${schema.hrPerformancePlans.manager_user_id} = ${actor.sub})`,
          isNull(schema.hrPerformancePlans.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrPerformancePlans.due_at));
  }

  // === Expenses

  async createExpense(
    actor: JwtPayload,
    dto: CreateExpenseDto,
    receiptUrl?: string,
  ) {
    const [row] = await this.db
      .insert(schema.hrExpenseReports)
      .values({
        employee_user_id: actor.sub,
        description: dto.description,
        amount_kobo: dto.amount_kobo,
        expense_date: new Date(dto.expense_date),
        category: dto.category,
        receipt_url: receiptUrl ?? null,
        status: "pending",
      })
      .returning();
    return row;
  }

  async listMyExpenses(actor: JwtPayload) {
    return this.db
      .select()
      .from(schema.hrExpenseReports)
      .where(
        and(
          eq(schema.hrExpenseReports.employee_user_id, actor.sub),
          isNull(schema.hrExpenseReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrExpenseReports.created_at));
  }

  async listExpensesAdmin(actor: JwtPayload) {
    if (!this.isHr(actor) && actor.role !== "employee") {
      throw new ForbiddenException();
    }
    if (this.isHr(actor)) {
      return this.db
        .select()
        .from(schema.hrExpenseReports)
        .where(isNull(schema.hrExpenseReports.deleted_at))
        .orderBy(desc(schema.hrExpenseReports.created_at));
    }
    const team = await this.directReportIds(actor.sub);
    if (!team.length) return [];
    return this.db
      .select()
      .from(schema.hrExpenseReports)
      .where(
        and(
          inUserIds(schema.hrExpenseReports.employee_user_id, team),
          isNull(schema.hrExpenseReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrExpenseReports.created_at));
  }

  async reviewExpense(
    expenseId: number,
    actor: JwtPayload,
    dto: ReviewExpenseDto,
  ) {
    const [expense] = await this.db
      .select()
      .from(schema.hrExpenseReports)
      .where(eq(schema.hrExpenseReports.id, expenseId))
      .limit(1);
    if (!expense) throw new NotFoundException("Expense not found");

    if (dto.status === "manager_approved") {
      await this.assertManagerOrHr(actor, expense.employee_user_id);
    } else if (dto.status === "hr_approved" || dto.status === "reimbursed") {
      if (!this.isHr(actor)) throw new ForbiddenException("HR only");
    } else if (dto.status === "rejected") {
      await this.assertManagerOrHr(actor, expense.employee_user_id);
    }

    const [updated] = await this.db
      .update(schema.hrExpenseReports)
      .set({
        status: dto.status,
        reviewer_user_id: actor.sub,
        reviewer_notes: dto.reviewer_notes ?? null,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.hrExpenseReports.id, expenseId))
      .returning();
    return updated;
  }

  // === Incidents

  async createIncident(actor: JwtPayload, dto: CreateIncidentDto) {
    const critical = dto.critical ?? false;
    const [row] = await this.db
      .insert(schema.hrIncidentReports)
      .values({
        reporter_user_id: actor.sub,
        occurred_at: new Date(dto.occurred_at),
        description: dto.description,
        people_involved: dto.people_involved ?? null,
        impact: dto.impact ?? null,
        corrective_actions: dto.corrective_actions ?? null,
        category: dto.category,
        critical,
        status: "reported",
      })
      .returning();

    if (critical) {
      void this.email
        .sendHrCriticalIncident({
          to: process.env.HR_ALERT_EMAIL ?? actor.email,
          reporterName: `${actor.first_name} ${actor.last_name}`.trim(),
          category: dto.category,
          description: dto.description,
        })
        .catch(() => undefined);
    }
    return row;
  }

  async listIncidents(actor: JwtPayload) {
    if (this.isHr(actor)) {
      return this.db
        .select()
        .from(schema.hrIncidentReports)
        .where(isNull(schema.hrIncidentReports.deleted_at))
        .orderBy(desc(schema.hrIncidentReports.created_at));
    }
    return this.db
      .select()
      .from(schema.hrIncidentReports)
      .where(
        and(
          eq(schema.hrIncidentReports.reporter_user_id, actor.sub),
          isNull(schema.hrIncidentReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrIncidentReports.created_at));
  }

  async updateIncident(
    incidentId: number,
    actor: JwtPayload,
    dto: UpdateIncidentDto,
  ) {
    if (!this.isHr(actor)) throw new ForbiddenException("HR only");
    const [updated] = await this.db
      .update(schema.hrIncidentReports)
      .set({
        status: dto.status,
        ...(dto.assignee_user_id !== undefined
          ? { assignee_user_id: dto.assignee_user_id }
          : {}),
        ...(dto.corrective_actions !== undefined
          ? { corrective_actions: dto.corrective_actions }
          : {}),
        updated_at: new Date(),
      })
      .where(eq(schema.hrIncidentReports.id, incidentId))
      .returning();
    if (!updated) throw new NotFoundException("Incident not found");
    return updated;
  }

  // === Project status reports

  async createProjectReport(actor: JwtPayload, dto: CreateProjectReportDto) {
    const [row] = await this.db
      .insert(schema.hrProjectStatusReports)
      .values({
        employee_user_id: actor.sub,
        project_name: dto.project_name,
        progress_pct: dto.progress_pct,
        completed_items: dto.completed_items ?? null,
        blockers: dto.blockers ?? null,
        next_steps: dto.next_steps ?? null,
        status: dto.submit ? "submitted" : "draft",
      })
      .returning();
    return row;
  }

  async listMyProjectReports(actor: JwtPayload) {
    return this.db
      .select()
      .from(schema.hrProjectStatusReports)
      .where(
        and(
          eq(schema.hrProjectStatusReports.employee_user_id, actor.sub),
          isNull(schema.hrProjectStatusReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrProjectStatusReports.created_at));
  }

  async listProjectReportsAdmin(actor: JwtPayload) {
    if (this.isHr(actor)) {
      return this.db
        .select()
        .from(schema.hrProjectStatusReports)
        .where(isNull(schema.hrProjectStatusReports.deleted_at))
        .orderBy(desc(schema.hrProjectStatusReports.created_at));
    }
    const team = await this.directReportIds(actor.sub);
    if (!team.length) return [];
    return this.db
      .select()
      .from(schema.hrProjectStatusReports)
      .where(
        and(
          inUserIds(schema.hrProjectStatusReports.employee_user_id, team),
          isNull(schema.hrProjectStatusReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrProjectStatusReports.created_at));
  }

  async approveProjectReport(reportId: number, actor: JwtPayload) {
    const [report] = await this.db
      .select()
      .from(schema.hrProjectStatusReports)
      .where(eq(schema.hrProjectStatusReports.id, reportId))
      .limit(1);
    if (!report) throw new NotFoundException("Project report not found");
    await this.assertManagerOrHr(actor, report.employee_user_id);
    const [updated] = await this.db
      .update(schema.hrProjectStatusReports)
      .set({
        status: "approved",
        reviewer_user_id: actor.sub,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.hrProjectStatusReports.id, reportId))
      .returning();
    return updated;
  }

  // === Org chart

  async orgChart() {
    const rows = await this.db
      .select({
        employee: schema.hrEmployees,
        user: {
          id: schema.users.id,
          first_name: schema.users.first_name,
          last_name: schema.users.last_name,
          email: schema.users.email,
          avatar_url: schema.users.avatar_url,
        },
      })
      .from(schema.hrEmployees)
      .innerJoin(schema.users, eq(schema.hrEmployees.user_id, schema.users.id))
      .where(
        and(
          isNull(schema.hrEmployees.deleted_at),
          sql`${schema.hrEmployees.status} <> 'terminated'`,
        ),
      );

    const byUser = new Map(
      rows.map((r) => [
        r.user.id,
        {
          user_id: r.user.id,
          name: `${r.user.first_name} ${r.user.last_name}`.trim(),
          email: r.user.email,
          avatar_url: r.user.avatar_url,
          job_title: r.employee.job_title,
          department: r.employee.department,
          manager_user_id: r.employee.manager_user_id,
          reports: [] as number[],
        },
      ]),
    );

    for (const node of byUser.values()) {
      if (node.manager_user_id && byUser.has(node.manager_user_id)) {
        byUser.get(node.manager_user_id)!.reports.push(node.user_id);
      }
    }

    const roots = [...byUser.values()].filter(
      (n) => !n.manager_user_id || !byUser.has(n.manager_user_id),
    );

    return { nodes: [...byUser.values()], roots };
  }

  // === Policies

  async createPolicy(actor: JwtPayload, dto: CreatePolicyDto) {
    if (!this.isHr(actor)) throw new ForbiddenException("HR only");
    const [row] = await this.db
      .insert(schema.hrPolicies)
      .values({
        title: dto.title,
        slug: dto.slug,
        body: dto.body,
        document_url: dto.document_url ?? null,
        version: dto.version,
        effective_at: new Date(dto.effective_at),
        restricted: dto.restricted ?? false,
        created_by: actor.sub,
      })
      .returning();
    return row;
  }

  async listPolicies(actor: JwtPayload) {
    const rows = await this.db
      .select()
      .from(schema.hrPolicies)
      .where(isNull(schema.hrPolicies.deleted_at))
      .orderBy(desc(schema.hrPolicies.effective_at));
    if (this.isHr(actor)) return rows;
    return rows.filter((p) => !p.restricted);
  }

  async acknowledgePolicy(policyId: number, actor: JwtPayload) {
    const [policy] = await this.db
      .select()
      .from(schema.hrPolicies)
      .where(eq(schema.hrPolicies.id, policyId))
      .limit(1);
    if (!policy) throw new NotFoundException("Policy not found");
    const [ack] = await this.db
      .insert(schema.hrPolicyAcknowledgments)
      .values({
        policy_id: policyId,
        user_id: actor.sub,
        acknowledged_at: new Date(),
        policy_version: policy.version,
      })
      .returning();
    return ack;
  }

  async listMyAcknowledgments(actor: JwtPayload) {
    return this.db
      .select()
      .from(schema.hrPolicyAcknowledgments)
      .where(eq(schema.hrPolicyAcknowledgments.user_id, actor.sub))
      .orderBy(desc(schema.hrPolicyAcknowledgments.acknowledged_at));
  }

  // === Sign requests (Jotform tracking)

  async createSignRequest(actor: JwtPayload, dto: CreateSignRequestDto) {
    if (!this.isHiringStaff(actor) && !this.isHr(actor)) {
      throw new ForbiddenException();
    }
    const baseUrl = process.env.JOTFORM_SIGN_BASE_URL;
    const signUrl =
      dto.sign_url ??
      (baseUrl
        ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}email=${encodeURIComponent(String(dto.subject_user_id))}`
        : null);

    const [row] = await this.db
      .insert(schema.hrSignRequests)
      .values({
        kind: dto.kind,
        status: signUrl ? "sent" : "pending",
        subject_user_id: dto.subject_user_id,
        application_id: dto.application_id ?? null,
        policy_id: dto.policy_id ?? null,
        title: dto.title,
        sign_url: signUrl,
        metadata: dto.metadata ?? null,
        created_by: actor.sub,
      })
      .returning();
    return row;
  }

  async listSignRequests(actor: JwtPayload) {
    if (this.isHr(actor)) {
      return this.db
        .select()
        .from(schema.hrSignRequests)
        .where(isNull(schema.hrSignRequests.deleted_at))
        .orderBy(desc(schema.hrSignRequests.created_at));
    }
    return this.db
      .select()
      .from(schema.hrSignRequests)
      .where(
        and(
          eq(schema.hrSignRequests.subject_user_id, actor.sub),
          isNull(schema.hrSignRequests.deleted_at),
        ),
      )
      .orderBy(desc(schema.hrSignRequests.created_at));
  }

  async handleSignWebhook(payload: {
    external_id?: string;
    sign_request_id?: number;
    status: "signed" | "declined" | "expired";
    signed_document_url?: string;
  }) {
    const id = payload.sign_request_id;
    if (!id && !payload.external_id) {
      throw new BadRequestException("sign_request_id or external_id required");
    }
    const where = id
      ? eq(schema.hrSignRequests.id, id)
      : eq(schema.hrSignRequests.external_id, payload.external_id!);

    const [updated] = await this.db
      .update(schema.hrSignRequests)
      .set({
        status: payload.status,
        signed_document_url: payload.signed_document_url ?? null,
        signed_at: payload.status === "signed" ? new Date() : null,
        updated_at: new Date(),
      })
      .where(where)
      .returning();
    if (!updated) throw new NotFoundException("Sign request not found");

    if (
      updated.status === "signed" &&
      updated.kind === "contract" &&
      updated.signed_document_url
    ) {
      await this.db
        .update(schema.hrEmployees)
        .set({
          contract_url: updated.signed_document_url,
          updated_at: new Date(),
        })
        .where(eq(schema.hrEmployees.user_id, updated.subject_user_id));
    }
    return updated;
  }

  // === Employee docs

  async updateEmployeeDocs(
    employeeUserId: number,
    actor: JwtPayload,
    dto: UploadEmployeeDocsDto,
    urls: {
      contract_url?: string;
      id_document_url?: string;
      certificates_urls?: string;
    },
  ) {
    if (!this.isHr(actor) && actor.sub !== employeeUserId) {
      throw new ForbiddenException();
    }
    const [emp] = await this.db
      .select()
      .from(schema.hrEmployees)
      .where(eq(schema.hrEmployees.user_id, employeeUserId))
      .limit(1);
    if (!emp) throw new NotFoundException("Employee not found");

    const [updated] = await this.db
      .update(schema.hrEmployees)
      .set({
        ...(dto.nin !== undefined ? { nin: dto.nin } : {}),
        ...(dto.tax_id !== undefined ? { tax_id: dto.tax_id } : {}),
        ...(dto.bank_account !== undefined
          ? { bank_account: dto.bank_account }
          : {}),
        ...(urls.contract_url ? { contract_url: urls.contract_url } : {}),
        ...(urls.id_document_url
          ? { id_document_url: urls.id_document_url }
          : {}),
        ...(urls.certificates_urls
          ? { certificates_urls: urls.certificates_urls }
          : {}),
        updated_at: new Date(),
      })
      .where(eq(schema.hrEmployees.id, emp.id))
      .returning();
    return updated;
  }

  // === Analytics

  async analytics(actor: JwtPayload) {
    if (!this.isHr(actor) && !this.isHiringStaff(actor)) {
      throw new ForbiddenException();
    }

    const [jobs] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${schema.hrJobPostings.status} = 'open')`,
        closed: sql<number>`count(*) filter (where ${schema.hrJobPostings.status} = 'closed')`,
        filled: sql<number>`count(*) filter (where ${schema.hrJobPostings.status} = 'filled')`,
        total: count(),
      })
      .from(schema.hrJobPostings)
      .where(isNull(schema.hrJobPostings.deleted_at));

    const [apps] = await this.db
      .select({
        total: count(),
        received: sql<number>`count(*) filter (where ${schema.hrApplications.status} = 'received')`,
        passed: sql<number>`count(*) filter (where ${schema.hrApplications.status} = 'passed')`,
        rejected: sql<number>`count(*) filter (where ${schema.hrApplications.status} = 'rejected')`,
      })
      .from(schema.hrApplications)
      .where(isNull(schema.hrApplications.deleted_at));

    const [empCount] = await this.db
      .select({ total: count() })
      .from(schema.hrEmployees)
      .where(
        and(
          isNull(schema.hrEmployees.deleted_at),
          sql`${schema.hrEmployees.status} <> 'terminated'`,
        ),
      );

    const deptRows = await this.db
      .select({
        department: schema.hrEmployees.department,
        count: count(),
      })
      .from(schema.hrEmployees)
      .where(
        and(
          isNull(schema.hrEmployees.deleted_at),
          sql`${schema.hrEmployees.status} <> 'terminated'`,
        ),
      )
      .groupBy(schema.hrEmployees.department);

    const [leavePending] = await this.db
      .select({ total: count() })
      .from(schema.hrLeaveRequests)
      .where(
        and(
          eq(schema.hrLeaveRequests.status, "pending"),
          isNull(schema.hrLeaveRequests.deleted_at),
        ),
      );

    const [reportsSubmitted] = await this.db
      .select({ total: count() })
      .from(schema.hrWorkActivityReports)
      .where(
        and(
          eq(schema.hrWorkActivityReports.status, "submitted"),
          isNull(schema.hrWorkActivityReports.deleted_at),
        ),
      );

    const filledApps = await this.db
      .select({
        applied_at: schema.hrApplications.created_at,
        hired_at: schema.hrEmployees.start_date,
      })
      .from(schema.hrEmployees)
      .innerJoin(
        schema.hrApplications,
        eq(schema.hrEmployees.application_id, schema.hrApplications.id),
      )
      .where(isNull(schema.hrEmployees.deleted_at));

    let avgTimeToHireDays: number | null = null;
    if (filledApps.length) {
      const days = filledApps
        .filter((r) => r.applied_at && r.hired_at)
        .map(
          (r) =>
            (r.hired_at!.getTime() - r.applied_at!.getTime()) /
            (1000 * 60 * 60 * 24),
        );
      if (days.length) {
        avgTimeToHireDays =
          Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10;
      }
    }

    const conversion =
      Number(apps?.total ?? 0) > 0
        ? {
            applied_to_passed:
              Math.round(
                (Number(apps?.passed ?? 0) / Number(apps.total)) * 1000,
              ) / 10,
            applied_to_hired:
              Math.round(
                ((filledApps.length || 0) / Number(apps.total)) * 1000,
              ) / 10,
          }
        : { applied_to_passed: 0, applied_to_hired: 0 };

    return {
      jobs,
      applications: apps,
      employees: {
        total: empCount?.total ?? 0,
        by_department: deptRows,
      },
      leave_pending: leavePending?.total ?? 0,
      work_reports_submitted: reportsSubmitted?.total ?? 0,
      avg_time_to_hire_days: avgTimeToHireDays,
      conversion,
    };
  }

  // === helpers

  private async requireReview(id: number) {
    const [review] = await this.db
      .select()
      .from(schema.hrPerformanceReviews)
      .where(
        and(
          eq(schema.hrPerformanceReviews.id, id),
          isNull(schema.hrPerformanceReviews.deleted_at),
        ),
      )
      .limit(1);
    if (!review) throw new NotFoundException("Review not found");
    return review;
  }

  private async directReportIds(managerId: number) {
    const rows = await this.db
      .select({ user_id: schema.hrEmployees.user_id })
      .from(schema.hrEmployees)
      .where(
        and(
          eq(schema.hrEmployees.manager_user_id, managerId),
          isNull(schema.hrEmployees.deleted_at),
        ),
      );
    return rows.map((r) => r.user_id);
  }

  private async assertManagerOrHr(actor: JwtPayload, employeeUserId: number) {
    if (this.isHr(actor)) return;
    const [emp] = await this.db
      .select()
      .from(schema.hrEmployees)
      .where(eq(schema.hrEmployees.user_id, employeeUserId))
      .limit(1);
    if (!emp || emp.manager_user_id !== actor.sub) {
      throw new ForbiddenException();
    }
  }
}

function orEqEmployeeOrManager(
  table: typeof schema.hrPerformanceReviews,
  userId: number,
) {
  return sql`(${table.employee_user_id} = ${userId} or ${table.manager_user_id} = ${userId})`;
}

function inUserIds(column: unknown, ids: number[]) {
  return sql`${column} in (${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )})`;
}
