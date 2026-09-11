import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { EmailService } from "../../../notification/features/email/email.service";
import type {
  CreateLeaveRequestDto,
  ReviewLeaveRequestDto,
  ReviewWorkReportDto,
  UpdateEmployeeAdminDto,
  UpdateMyEmployeeProfileDto,
  UpsertWorkReportDto,
} from "./dto/people-ops.dto";

@Injectable()
export class CareersPeopleService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly email: EmailService,
  ) {}

  // === Directory

  async listDirectory(opts: {
    actor: JwtPayload;
    q?: string;
    department?: string;
    status?: string;
  }) {
    const isAdmin = opts.actor.role === "admin";

    const conditions = [isNull(schema.careersEmployees.deleted_at)];

    if (!isAdmin) {
      // Managers see themselves + direct reports; employees see active directory
      if (opts.actor.role === "employee") {
        conditions.push(
          or(
            eq(schema.careersEmployees.user_id, opts.actor.sub),
            eq(schema.careersEmployees.manager_user_id, opts.actor.sub),
            eq(schema.careersEmployees.status, "active"),
          )!,
        );
      }
    }

    if (opts.department) {
      conditions.push(eq(schema.careersEmployees.department, opts.department));
    }
    if (opts.status) {
      conditions.push(
        eq(
          schema.careersEmployees.status,
          opts.status as "active" | "on_leave" | "probation" | "terminated",
        ),
      );
    }

    const rows = await this.db
      .select({
        employee: schema.careersEmployees,
        user: {
          id: schema.users.id,
          first_name: schema.users.first_name,
          last_name: schema.users.last_name,
          email: schema.users.email,
          phone: schema.users.phone,
          role: schema.users.role,
          avatar_url: schema.users.avatar_url,
        },
      })
      .from(schema.careersEmployees)
      .innerJoin(
        schema.users,
        eq(schema.careersEmployees.user_id, schema.users.id),
      )
      .where(and(...conditions))
      .orderBy(schema.users.first_name);

    if (!opts.q) return rows;

    const needle = opts.q.toLowerCase();
    return rows.filter((r) => {
      const hay =
        `${r.user.first_name} ${r.user.last_name} ${r.user.email} ${r.employee.job_title} ${r.employee.department}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  async getMyEmployeeProfile(actor: JwtPayload) {
    return this.requireEmployeeRow(actor.sub);
  }

  async getEmployeeProfile(employeeUserId: number, actor: JwtPayload) {
    const isAdmin = actor.role === "admin";
    const row = await this.requireEmployeeRow(employeeUserId);
    if (
      !isAdmin &&
      actor.sub !== employeeUserId &&
      row.employee.manager_user_id !== actor.sub
    ) {
      throw new ForbiddenException("You cannot view this employee profile");
    }
    return row;
  }

  async updateMyProfile(actor: JwtPayload, dto: UpdateMyEmployeeProfileDto) {
    const { employee } = await this.requireEmployeeRow(actor.sub);

    if (dto.phone !== undefined) {
      await this.db
        .update(schema.users)
        .set({ phone: dto.phone, updated_at: new Date() })
        .where(eq(schema.users.id, actor.sub));
    }

    const [updated] = await this.db
      .update(schema.careersEmployees)
      .set({
        ...(dto.home_address !== undefined
          ? { home_address: dto.home_address }
          : {}),
        ...(dto.next_of_kin !== undefined
          ? { next_of_kin: dto.next_of_kin }
          : {}),
        ...(dto.emergency_contact !== undefined
          ? { emergency_contact: dto.emergency_contact }
          : {}),
        ...(dto.date_of_birth !== undefined
          ? {
              date_of_birth: dto.date_of_birth
                ? new Date(dto.date_of_birth)
                : null,
            }
          : {}),
        updated_at: new Date(),
      })
      .where(eq(schema.careersEmployees.id, employee.id))
      .returning();

    return this.requireEmployeeRow(actor.sub);
  }

  async updateEmployeeAdmin(
    employeeUserId: number,
    dto: UpdateEmployeeAdminDto,
  ) {
    const { employee } = await this.requireEmployeeRow(employeeUserId);
    await this.db
      .update(schema.careersEmployees)
      .set({
        ...(dto.job_title !== undefined ? { job_title: dto.job_title } : {}),
        ...(dto.department !== undefined ? { department: dto.department } : {}),
        ...(dto.manager_user_id !== undefined
          ? { manager_user_id: dto.manager_user_id }
          : {}),
        ...(dto.employment_type !== undefined
          ? { employment_type: dto.employment_type }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.work_location !== undefined
          ? { work_location: dto.work_location }
          : {}),
        ...(dto.home_address !== undefined
          ? { home_address: dto.home_address }
          : {}),
        ...(dto.next_of_kin !== undefined
          ? { next_of_kin: dto.next_of_kin }
          : {}),
        ...(dto.emergency_contact !== undefined
          ? { emergency_contact: dto.emergency_contact }
          : {}),
        ...(dto.date_of_birth !== undefined
          ? {
              date_of_birth: dto.date_of_birth
                ? new Date(dto.date_of_birth)
                : null,
            }
          : {}),
        updated_at: new Date(),
      })
      .where(eq(schema.careersEmployees.id, employee.id));
    return this.requireEmployeeRow(employeeUserId);
  }

  // === Leave

  async createLeaveRequest(actor: JwtPayload, dto: CreateLeaveRequestDto) {
    await this.requireEmployeeRow(actor.sub);
    const [row] = await this.db
      .insert(schema.careersLeaveRequests)
      .values({
        employee_user_id: actor.sub,
        leave_type: dto.leave_type,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        reason: dto.reason,
        coverage_plan: dto.coverage_plan ?? null,
        status: "pending",
      })
      .returning();

    const manager = await this.resolveManagerContact(actor.sub);
    if (manager) {
      void this.email
        .sendCareersLeaveSubmitted({
          to: manager.email,
          managerName: manager.name,
          employeeName: `${actor.first_name} ${actor.last_name}`.trim(),
          leaveType: dto.leave_type,
          startDate: dto.start_date.slice(0, 10),
          endDate: dto.end_date.slice(0, 10),
        })
        .catch(() => undefined);
    }

    return row;
  }

  async listMyLeave(actor: JwtPayload) {
    return this.db
      .select()
      .from(schema.careersLeaveRequests)
      .where(
        and(
          eq(schema.careersLeaveRequests.employee_user_id, actor.sub),
          isNull(schema.careersLeaveRequests.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersLeaveRequests.created_at));
  }

  async listLeaveForReview(actor: JwtPayload) {
    const isAdmin = actor.role === "admin";
    if (isAdmin) {
      return this.db
        .select()
        .from(schema.careersLeaveRequests)
        .where(isNull(schema.careersLeaveRequests.deleted_at))
        .orderBy(desc(schema.careersLeaveRequests.created_at));
    }

    const teamIds = await this.directReportUserIds(actor.sub);
    if (teamIds.length === 0) return [];

    return this.db
      .select()
      .from(schema.careersLeaveRequests)
      .where(
        and(
          sql`${schema.careersLeaveRequests.employee_user_id} in (${sql.join(
            teamIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          isNull(schema.careersLeaveRequests.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersLeaveRequests.created_at));
  }

  async reviewLeave(
    leaveId: number,
    actor: JwtPayload,
    dto: ReviewLeaveRequestDto,
  ) {
    const leave = await this.requireLeave(leaveId);
    if (leave.status !== "pending") {
      throw new BadRequestException(`Leave is already ${leave.status}`);
    }
    await this.assertCanReviewEmployee(actor, leave.employee_user_id);

    const nextStatus = dto.status === "approved" ? "approved" : "rejected";
    const [updated] = await this.db
      .update(schema.careersLeaveRequests)
      .set({
        status: nextStatus,
        reviewer_user_id: actor.sub,
        reviewer_notes: dto.reviewer_notes ?? null,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.careersLeaveRequests.id, leaveId))
      .returning();

    if (nextStatus === "approved") {
      await this.db
        .update(schema.careersEmployees)
        .set({ status: "on_leave", updated_at: new Date() })
        .where(eq(schema.careersEmployees.user_id, leave.employee_user_id));
    }

    const [employeeUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, leave.employee_user_id))
      .limit(1);
    if (employeeUser) {
      void this.email
        .sendCareersLeaveDecision({
          to: employeeUser.email,
          name: `${employeeUser.first_name} ${employeeUser.last_name}`.trim(),
          leaveType: leave.leave_type,
          status: nextStatus,
          notes: dto.reviewer_notes,
        })
        .catch(() => undefined);
    }

    return updated;
  }

  // === Work activity reports

  async saveWorkReport(actor: JwtPayload, dto: UpsertWorkReportDto) {
    await this.requireEmployeeRow(actor.sub);
    const status = dto.submit ? "submitted" : "draft";
    const [row] = await this.db
      .insert(schema.careersWorkActivityReports)
      .values({
        employee_user_id: actor.sub,
        period_type: dto.period_type,
        period_start: new Date(dto.period_start),
        period_end: new Date(dto.period_end),
        tasks_completed: dto.tasks_completed,
        milestones: dto.milestones ?? null,
        challenges: dto.challenges ?? null,
        next_steps: dto.next_steps ?? null,
        status,
      })
      .returning();

    if (status === "submitted") {
      const manager = await this.resolveManagerContact(actor.sub);
      if (manager) {
        void this.email
          .sendCareersWorkReportSubmitted({
            to: manager.email,
            managerName: manager.name,
            employeeName: `${actor.first_name} ${actor.last_name}`.trim(),
            periodType: dto.period_type,
          })
          .catch(() => undefined);
      }
    }

    return row;
  }

  async updateWorkReport(
    reportId: number,
    actor: JwtPayload,
    dto: UpsertWorkReportDto,
  ) {
    const report = await this.requireWorkReport(reportId);
    if (report.employee_user_id !== actor.sub) {
      throw new ForbiddenException("Not your report");
    }
    if (report.status !== "draft" && report.status !== "revision_requested") {
      throw new BadRequestException(
        "Only draft or revision-requested reports can be edited",
      );
    }

    const [updated] = await this.db
      .update(schema.careersWorkActivityReports)
      .set({
        period_type: dto.period_type,
        period_start: new Date(dto.period_start),
        period_end: new Date(dto.period_end),
        tasks_completed: dto.tasks_completed,
        milestones: dto.milestones ?? null,
        challenges: dto.challenges ?? null,
        next_steps: dto.next_steps ?? null,
        status: dto.submit ? "submitted" : "draft",
        reviewer_notes: null,
        updated_at: new Date(),
      })
      .where(eq(schema.careersWorkActivityReports.id, reportId))
      .returning();

    if (dto.submit) {
      const manager = await this.resolveManagerContact(actor.sub);
      if (manager) {
        void this.email
          .sendCareersWorkReportSubmitted({
            to: manager.email,
            managerName: manager.name,
            employeeName: `${actor.first_name} ${actor.last_name}`.trim(),
            periodType: dto.period_type,
          })
          .catch(() => undefined);
      }
    }

    return updated;
  }

  async listMyWorkReports(actor: JwtPayload) {
    return this.db
      .select()
      .from(schema.careersWorkActivityReports)
      .where(
        and(
          eq(schema.careersWorkActivityReports.employee_user_id, actor.sub),
          isNull(schema.careersWorkActivityReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersWorkActivityReports.created_at));
  }

  async listWorkReportsForReview(actor: JwtPayload) {
    const isAdmin = actor.role === "admin";
    if (isAdmin) {
      return this.db
        .select()
        .from(schema.careersWorkActivityReports)
        .where(isNull(schema.careersWorkActivityReports.deleted_at))
        .orderBy(desc(schema.careersWorkActivityReports.created_at));
    }

    const teamIds = await this.directReportUserIds(actor.sub);
    if (teamIds.length === 0) return [];

    return this.db
      .select()
      .from(schema.careersWorkActivityReports)
      .where(
        and(
          sql`${schema.careersWorkActivityReports.employee_user_id} in (${sql.join(
            teamIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          isNull(schema.careersWorkActivityReports.deleted_at),
        ),
      )
      .orderBy(desc(schema.careersWorkActivityReports.created_at));
  }

  async reviewWorkReport(
    reportId: number,
    actor: JwtPayload,
    dto: ReviewWorkReportDto,
  ) {
    const report = await this.requireWorkReport(reportId);
    if (
      report.status !== "submitted" &&
      report.status !== "revision_requested"
    ) {
      throw new BadRequestException("Only submitted reports can be reviewed");
    }
    await this.assertCanReviewEmployee(actor, report.employee_user_id);

    const [updated] = await this.db
      .update(schema.careersWorkActivityReports)
      .set({
        status: dto.status,
        reviewer_user_id: actor.sub,
        reviewer_notes: dto.reviewer_notes ?? null,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.careersWorkActivityReports.id, reportId))
      .returning();

    const [employeeUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, report.employee_user_id))
      .limit(1);
    if (employeeUser) {
      void this.email
        .sendCareersWorkReportDecision({
          to: employeeUser.email,
          name: `${employeeUser.first_name} ${employeeUser.last_name}`.trim(),
          status: dto.status,
          notes: dto.reviewer_notes,
        })
        .catch(() => undefined);
    }

    return updated;
  }

  // === helpers

  private async requireEmployeeRow(userId: number) {
    const [row] = await this.db
      .select({
        employee: schema.careersEmployees,
        user: {
          id: schema.users.id,
          first_name: schema.users.first_name,
          last_name: schema.users.last_name,
          email: schema.users.email,
          phone: schema.users.phone,
          role: schema.users.role,
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
          eq(schema.careersEmployees.user_id, userId),
          isNull(schema.careersEmployees.deleted_at),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException("Employee profile not found");
    }
    return row;
  }

  private async requireLeave(id: number) {
    const [leave] = await this.db
      .select()
      .from(schema.careersLeaveRequests)
      .where(
        and(
          eq(schema.careersLeaveRequests.id, id),
          isNull(schema.careersLeaveRequests.deleted_at),
        ),
      )
      .limit(1);
    if (!leave) throw new NotFoundException("Leave request not found");
    return leave;
  }

  private async requireWorkReport(id: number) {
    const [report] = await this.db
      .select()
      .from(schema.careersWorkActivityReports)
      .where(
        and(
          eq(schema.careersWorkActivityReports.id, id),
          isNull(schema.careersWorkActivityReports.deleted_at),
        ),
      )
      .limit(1);
    if (!report) throw new NotFoundException("Work report not found");
    return report;
  }

  private async directReportUserIds(managerUserId: number): Promise<number[]> {
    const rows = await this.db
      .select({ user_id: schema.careersEmployees.user_id })
      .from(schema.careersEmployees)
      .where(
        and(
          eq(schema.careersEmployees.manager_user_id, managerUserId),
          isNull(schema.careersEmployees.deleted_at),
        ),
      );
    return rows.map((r) => r.user_id);
  }

  private async assertCanReviewEmployee(
    actor: JwtPayload,
    employeeUserId: number,
  ) {
    if (actor.role === "admin") return;
    const { employee } = await this.requireEmployeeRow(employeeUserId);
    if (employee.manager_user_id !== actor.sub) {
      throw new ForbiddenException(
        "Only the employee's manager or HR can review this",
      );
    }
  }

  private async resolveManagerContact(employeeUserId: number) {
    const { employee } = await this.requireEmployeeRow(employeeUserId);
    if (!employee.manager_user_id) return null;
    const [manager] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, employee.manager_user_id))
      .limit(1);
    if (!manager) return null;
    return {
      email: manager.email,
      name: `${manager.first_name} ${manager.last_name}`.trim(),
    };
  }
}
