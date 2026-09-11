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
} from "./dto/careers-ops.dto";

const ADMIN_ROLES = new Set(["admin"]);
const HIRING_ROLES = new Set(["admin"]);

@Injectable()
export class CareersOpsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly email: EmailService,
  ) {}

  private isCareersAdmin(actor: JwtPayload) {
    return ADMIN_ROLES.has(actor.role);
  }

  private isHiringStaff(actor: JwtPayload) {
    return HIRING_ROLES.has(actor.role);
  }

  // === Performance reviews

  async createReview(actor: JwtPayload, dto: CreatePerformanceReviewDto) {
    if (!this.isCareersAdmin(actor)) {
      await this.assertManagerOrAdmin(actor, dto.employee_user_id);
    }
    const [row] = await this.db
      .insert(schema.careersPerformanceReviews)
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
      .update(schema.careersPerformanceReviews)
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
      .where(eq(schema.careersPerformanceReviews.id, reviewId))
      .returning();
    return updated;
  }

  async submitManagerReview(
    reviewId: number,
    actor: JwtPayload,
    dto: ManagerReviewDto,
  ) {
    const review = await this.requireReview(reviewId);
    if (!this.isCareersAdmin(actor) && review.manager_user_id !== actor.sub) {
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
      .update(schema.careersPerformanceReviews)
      .set({
        manager_goals_met: dto.manager_goals_met,
        manager_rating: dto.manager_rating,
        manager_feedback: dto.manager_feedback ?? null,
        manager_submitted_at: new Date(),
        probation_decision: dto.probation_decision ?? null,
        status: "completed",
        updated_at: new Date(),
      })
      .where(eq(schema.careersPerformanceReviews.id, reviewId))
      .returning();

    if (
      review.review_type === "probation" &&
      dto.probation_decision === "confirm"
    ) {
      await this.db
        .update(schema.careersEmployees)
        .set({ status: "active", updated_at: new Date() })
        .where(eq(schema.careersEmployees.user_id, review.employee_user_id));
    }
    if (
      review.review_type === "probation" &&
      dto.probation_decision === "terminate"
    ) {
      await this.db
        .update(schema.careersEmployees)
        .set({ status: "terminated", updated_at: new Date() })
        .where(eq(schema.careersEmployees.user_id, review.employee_user_id));
    }

    return updated;
  }

  async listReviews(actor: JwtPayload) {
    if (this.isCareersAdmin(actor)) {
      return this.db
        .select()
        .from(schema.careersPerformanceReviews)
        .where(isNull(schema.careersPerformanceReviews.deleted_at))
        .orderBy(desc(schema.careersPerformanceReviews.due_at));
    }
    return this.db
      .select()
      .from(schema.careersPerformanceReviews)
      .where(
        and(
          orEqEmployeeOrManager(schema.careersPerformanceReviews, actor.sub),
          isNull(schema.careersPerformanceReviews.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersPerformanceReviews.due_at));
  }

  async createPip(actor: JwtPayload, dto: CreatePipDto) {
    if (!this.isCareersAdmin(actor)) {
      await this.assertManagerOrAdmin(actor, dto.employee_user_id);
    }
    const [row] = await this.db
      .insert(schema.careersPerformancePlans)
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
      .from(schema.careersPerformancePlans)
      .where(
        and(
          eq(schema.careersPerformancePlans.id, pipId),
          isNull(schema.careersPerformancePlans.deleted_at),
        ),
      )
      .limit(1);
    if (!pip) throw new NotFoundException("PIP not found");
    if (!this.isCareersAdmin(actor) && pip.manager_user_id !== actor.sub) {
      throw new ForbiddenException();
    }
    const [updated] = await this.db
      .update(schema.careersPerformancePlans)
      .set({
        status: dto.status,
        outcome_notes: dto.outcome_notes ?? null,
        closed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.careersPerformancePlans.id, pipId))
      .returning();
    return updated;
  }

  async listPips(actor: JwtPayload) {
    if (this.isCareersAdmin(actor)) {
      return this.db
        .select()
        .from(schema.careersPerformancePlans)
        .where(isNull(schema.careersPerformancePlans.deleted_at))
        .orderBy(desc(schema.careersPerformancePlans.due_at));
    }
    return this.db
      .select()
      .from(schema.careersPerformancePlans)
      .where(
        and(
          sql`(${schema.careersPerformancePlans.employee_user_id} = ${actor.sub} or ${schema.careersPerformancePlans.manager_user_id} = ${actor.sub})`,
          isNull(schema.careersPerformancePlans.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersPerformancePlans.due_at));
  }

  // === Expenses

  async createExpense(
    actor: JwtPayload,
    dto: CreateExpenseDto,
    receiptUrl?: string,
  ) {
    const [row] = await this.db
      .insert(schema.careersExpenseReports)
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
      .from(schema.careersExpenseReports)
      .where(
        and(
          eq(schema.careersExpenseReports.employee_user_id, actor.sub),
          isNull(schema.careersExpenseReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersExpenseReports.created_at));
  }

  async listExpensesAdmin(actor: JwtPayload) {
    if (!this.isCareersAdmin(actor) && actor.role !== "employee") {
      throw new ForbiddenException();
    }
    if (this.isCareersAdmin(actor)) {
      return this.db
        .select()
        .from(schema.careersExpenseReports)
        .where(isNull(schema.careersExpenseReports.deleted_at))
        .orderBy(desc(schema.careersExpenseReports.created_at));
    }
    const team = await this.directReportIds(actor.sub);
    if (!team.length) return [];
    return this.db
      .select()
      .from(schema.careersExpenseReports)
      .where(
        and(
          inUserIds(schema.careersExpenseReports.employee_user_id, team),
          isNull(schema.careersExpenseReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersExpenseReports.created_at));
  }

  async reviewExpense(
    expenseId: number,
    actor: JwtPayload,
    dto: ReviewExpenseDto,
  ) {
    const [expense] = await this.db
      .select()
      .from(schema.careersExpenseReports)
      .where(eq(schema.careersExpenseReports.id, expenseId))
      .limit(1);
    if (!expense) throw new NotFoundException("Expense not found");

    if (dto.status === "manager_approved") {
      await this.assertManagerOrAdmin(actor, expense.employee_user_id);
    } else if (dto.status === "admin_approved" || dto.status === "reimbursed") {
      if (!this.isCareersAdmin(actor))
        throw new ForbiddenException("Admin only");
    } else if (dto.status === "rejected") {
      await this.assertManagerOrAdmin(actor, expense.employee_user_id);
    }

    const [updated] = await this.db
      .update(schema.careersExpenseReports)
      .set({
        status: dto.status,
        reviewer_user_id: actor.sub,
        reviewer_notes: dto.reviewer_notes ?? null,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.careersExpenseReports.id, expenseId))
      .returning();
    return updated;
  }

  // === Incidents

  async createIncident(actor: JwtPayload, dto: CreateIncidentDto) {
    const critical = dto.critical ?? false;
    const [row] = await this.db
      .insert(schema.careersIncidentReports)
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
        .sendCareersCriticalIncident({
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
    if (this.isCareersAdmin(actor)) {
      return this.db
        .select()
        .from(schema.careersIncidentReports)
        .where(isNull(schema.careersIncidentReports.deleted_at))
        .orderBy(desc(schema.careersIncidentReports.created_at));
    }
    return this.db
      .select()
      .from(schema.careersIncidentReports)
      .where(
        and(
          eq(schema.careersIncidentReports.reporter_user_id, actor.sub),
          isNull(schema.careersIncidentReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersIncidentReports.created_at));
  }

  async updateIncident(
    incidentId: number,
    actor: JwtPayload,
    dto: UpdateIncidentDto,
  ) {
    if (!this.isCareersAdmin(actor)) throw new ForbiddenException("Admin only");
    const [updated] = await this.db
      .update(schema.careersIncidentReports)
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
      .where(eq(schema.careersIncidentReports.id, incidentId))
      .returning();
    if (!updated) throw new NotFoundException("Incident not found");
    return updated;
  }

  // === Project status reports

  async createProjectReport(actor: JwtPayload, dto: CreateProjectReportDto) {
    const [row] = await this.db
      .insert(schema.careersProjectStatusReports)
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
      .from(schema.careersProjectStatusReports)
      .where(
        and(
          eq(schema.careersProjectStatusReports.employee_user_id, actor.sub),
          isNull(schema.careersProjectStatusReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersProjectStatusReports.created_at));
  }

  async listProjectReportsAdmin(actor: JwtPayload) {
    if (this.isCareersAdmin(actor)) {
      return this.db
        .select()
        .from(schema.careersProjectStatusReports)
        .where(isNull(schema.careersProjectStatusReports.deleted_at))
        .orderBy(desc(schema.careersProjectStatusReports.created_at));
    }
    const team = await this.directReportIds(actor.sub);
    if (!team.length) return [];
    return this.db
      .select()
      .from(schema.careersProjectStatusReports)
      .where(
        and(
          inUserIds(schema.careersProjectStatusReports.employee_user_id, team),
          isNull(schema.careersProjectStatusReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersProjectStatusReports.created_at));
  }

  async approveProjectReport(reportId: number, actor: JwtPayload) {
    const [report] = await this.db
      .select()
      .from(schema.careersProjectStatusReports)
      .where(eq(schema.careersProjectStatusReports.id, reportId))
      .limit(1);
    if (!report) throw new NotFoundException("Project report not found");
    await this.assertManagerOrAdmin(actor, report.employee_user_id);
    const [updated] = await this.db
      .update(schema.careersProjectStatusReports)
      .set({
        status: "approved",
        reviewer_user_id: actor.sub,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.careersProjectStatusReports.id, reportId))
      .returning();
    return updated;
  }

  // === Org chart

  async orgChart() {
    const rows = await this.db
      .select({
        employee: schema.careersEmployees,
        user: {
          id: schema.users.id,
          first_name: schema.users.first_name,
          last_name: schema.users.last_name,
          email: schema.users.email,
          avatar_url: schema.users.avatar_url,
        },
      })
      .from(schema.careersEmployees)
      .innerJoin(
        schema.users,
        eq(schema.careersEmployees.user_id, schema.users.id),
      )
      .where(
        and(
          isNull(schema.careersEmployees.deleted_at),
          sql`${schema.careersEmployees.status} <> 'terminated'`,
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
    if (!this.isCareersAdmin(actor)) throw new ForbiddenException("Admin only");
    const [row] = await this.db
      .insert(schema.careersPolicies)
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
      .from(schema.careersPolicies)
      .where(isNull(schema.careersPolicies.deleted_at))
      .orderBy(desc(schema.careersPolicies.effective_at));
    if (this.isCareersAdmin(actor)) return rows;
    return rows.filter((p) => !p.restricted);
  }

  async acknowledgePolicy(policyId: number, actor: JwtPayload) {
    const [policy] = await this.db
      .select()
      .from(schema.careersPolicies)
      .where(eq(schema.careersPolicies.id, policyId))
      .limit(1);
    if (!policy) throw new NotFoundException("Policy not found");
    const [ack] = await this.db
      .insert(schema.careersPolicyAcknowledgments)
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
      .from(schema.careersPolicyAcknowledgments)
      .where(eq(schema.careersPolicyAcknowledgments.user_id, actor.sub))
      .orderBy(desc(schema.careersPolicyAcknowledgments.acknowledged_at));
  }

  // === Sign requests (Jotform tracking)

  async createSignRequest(actor: JwtPayload, dto: CreateSignRequestDto) {
    if (!this.isHiringStaff(actor) && !this.isCareersAdmin(actor)) {
      throw new ForbiddenException();
    }
    const baseUrl = process.env.JOTFORM_SIGN_BASE_URL;
    const signUrl =
      dto.sign_url ??
      (baseUrl
        ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}email=${encodeURIComponent(String(dto.subject_user_id))}`
        : null);

    const [row] = await this.db
      .insert(schema.careersSignRequests)
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
    if (this.isCareersAdmin(actor)) {
      return this.db
        .select()
        .from(schema.careersSignRequests)
        .where(isNull(schema.careersSignRequests.deleted_at))
        .orderBy(desc(schema.careersSignRequests.created_at));
    }
    return this.db
      .select()
      .from(schema.careersSignRequests)
      .where(
        and(
          eq(schema.careersSignRequests.subject_user_id, actor.sub),
          isNull(schema.careersSignRequests.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersSignRequests.created_at));
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
      ? eq(schema.careersSignRequests.id, id)
      : eq(schema.careersSignRequests.external_id, payload.external_id!);

    const [updated] = await this.db
      .update(schema.careersSignRequests)
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
        .update(schema.careersEmployees)
        .set({
          contract_url: updated.signed_document_url,
          updated_at: new Date(),
        })
        .where(eq(schema.careersEmployees.user_id, updated.subject_user_id));
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
    if (!this.isCareersAdmin(actor) && actor.sub !== employeeUserId) {
      throw new ForbiddenException();
    }
    const [emp] = await this.db
      .select()
      .from(schema.careersEmployees)
      .where(eq(schema.careersEmployees.user_id, employeeUserId))
      .limit(1);
    if (!emp) throw new NotFoundException("Employee not found");

    const [updated] = await this.db
      .update(schema.careersEmployees)
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
      .where(eq(schema.careersEmployees.id, emp.id))
      .returning();
    return updated;
  }

  // === Analytics

  async analytics(actor: JwtPayload) {
    if (!this.isCareersAdmin(actor) && !this.isHiringStaff(actor)) {
      throw new ForbiddenException();
    }

    const [jobs] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${schema.careersJobPostings.status} = 'open')`,
        closed: sql<number>`count(*) filter (where ${schema.careersJobPostings.status} = 'closed')`,
        filled: sql<number>`count(*) filter (where ${schema.careersJobPostings.status} = 'filled')`,
        total: count(),
      })
      .from(schema.careersJobPostings)
      .where(isNull(schema.careersJobPostings.deleted_at));

    const [apps] = await this.db
      .select({
        total: count(),
        received: sql<number>`count(*) filter (where ${schema.careersApplications.status} = 'received')`,
        passed: sql<number>`count(*) filter (where ${schema.careersApplications.status} = 'passed')`,
        rejected: sql<number>`count(*) filter (where ${schema.careersApplications.status} = 'rejected')`,
      })
      .from(schema.careersApplications)
      .where(isNull(schema.careersApplications.deleted_at));

    const [empCount] = await this.db
      .select({ total: count() })
      .from(schema.careersEmployees)
      .where(
        and(
          isNull(schema.careersEmployees.deleted_at),
          sql`${schema.careersEmployees.status} <> 'terminated'`,
        ),
      );

    const deptRows = await this.db
      .select({
        department: schema.careersEmployees.department,
        count: count(),
      })
      .from(schema.careersEmployees)
      .where(
        and(
          isNull(schema.careersEmployees.deleted_at),
          sql`${schema.careersEmployees.status} <> 'terminated'`,
        ),
      )
      .groupBy(schema.careersEmployees.department);

    const [leavePending] = await this.db
      .select({ total: count() })
      .from(schema.careersLeaveRequests)
      .where(
        and(
          eq(schema.careersLeaveRequests.status, "pending"),
          isNull(schema.careersLeaveRequests.deleted_at),
        ),
      );

    const [reportsSubmitted] = await this.db
      .select({ total: count() })
      .from(schema.careersWorkActivityReports)
      .where(
        and(
          eq(schema.careersWorkActivityReports.status, "submitted"),
          isNull(schema.careersWorkActivityReports.deleted_at),
        ),
      );

    const filledApps = await this.db
      .select({
        applied_at: schema.careersApplications.created_at,
        hired_at: schema.careersEmployees.start_date,
      })
      .from(schema.careersEmployees)
      .innerJoin(
        schema.careersApplications,
        eq(
          schema.careersEmployees.application_id,
          schema.careersApplications.id,
        ),
      )
      .where(isNull(schema.careersEmployees.deleted_at));

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
      .from(schema.careersPerformanceReviews)
      .where(
        and(
          eq(schema.careersPerformanceReviews.id, id),
          isNull(schema.careersPerformanceReviews.deleted_at),
        ),
      )
      .limit(1);
    if (!review) throw new NotFoundException("Review not found");
    return review;
  }

  private async directReportIds(managerId: number) {
    const rows = await this.db
      .select({ user_id: schema.careersEmployees.user_id })
      .from(schema.careersEmployees)
      .where(
        and(
          eq(schema.careersEmployees.manager_user_id, managerId),
          isNull(schema.careersEmployees.deleted_at),
        ),
      );
    return rows.map((r) => r.user_id);
  }

  private async assertManagerOrAdmin(
    actor: JwtPayload,
    employeeUserId: number,
  ) {
    if (this.isCareersAdmin(actor)) return;
    const [emp] = await this.db
      .select()
      .from(schema.careersEmployees)
      .where(eq(schema.careersEmployees.user_id, employeeUserId))
      .limit(1);
    if (!emp || emp.manager_user_id !== actor.sub) {
      throw new ForbiddenException();
    }
  }
}

function orEqEmployeeOrManager(
  table: typeof schema.careersPerformanceReviews,
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
