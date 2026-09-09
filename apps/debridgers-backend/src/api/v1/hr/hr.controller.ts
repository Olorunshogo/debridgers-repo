import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { HrService } from "./hr.service";
import { HrPeopleService } from "./hr-people.service";
import { HrOpsService } from "./hr-ops.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import { CloudinaryService } from "../../../infrastructure/cloudinary/cloudinary.service";
import {
  createJobPostingSchema,
  updateJobPostingSchema,
  type CreateJobPostingDto,
  type UpdateJobPostingDto,
} from "./dto/job-posting.dto";
import {
  applyJobSchema,
  screenApplicationSchema,
  type ApplyJobDto,
  type ScreenApplicationDto,
} from "./dto/application.dto";
import {
  interviewFeedbackSchema,
  scheduleInterviewSchema,
  type InterviewFeedbackDto,
  type ScheduleInterviewDto,
} from "./dto/interview.dto";
import { createOfferSchema, type CreateOfferDto } from "./dto/offer.dto";
import {
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
  reviewWorkReportSchema,
  updateEmployeeAdminSchema,
  updateMyEmployeeProfileSchema,
  upsertWorkReportSchema,
  type CreateLeaveRequestDto,
  type ReviewLeaveRequestDto,
  type ReviewWorkReportDto,
  type UpdateEmployeeAdminDto,
  type UpdateMyEmployeeProfileDto,
  type UpsertWorkReportDto,
} from "./dto/people-ops.dto";
import {
  closePipSchema,
  createExpenseSchema,
  createIncidentSchema,
  createPerformanceReviewSchema,
  createPipSchema,
  createPolicySchema,
  createProjectReportSchema,
  createSignRequestSchema,
  managerReviewSchema,
  reviewExpenseSchema,
  selfAssessmentSchema,
  signWebhookSchema,
  updateIncidentSchema,
  uploadEmployeeDocsSchema,
  type ClosePipDto,
  type CreateExpenseDto,
  type CreateIncidentDto,
  type CreatePerformanceReviewDto,
  type CreatePipDto,
  type CreatePolicyDto,
  type CreateProjectReportDto,
  type CreateSignRequestDto,
  type ManagerReviewDto,
  type ReviewExpenseDto,
  type SelfAssessmentDto,
  type SignWebhookDto,
  type UpdateIncidentDto,
  type UploadEmployeeDocsDto,
} from "./dto/hr-ops.dto";

@ApiTags("HR")
@Controller("hr")
export class HrController {
  constructor(
    private readonly hr: HrService,
    private readonly people: HrPeopleService,
    private readonly ops: HrOpsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // === Public careers

  @Get("jobs")
  @ApiOperation({ summary: "List open job postings (public careers board)" })
  listOpenJobs() {
    return this.hr.listOpenJobs();
  }

  @Get("jobs/:id")
  @ApiOperation({ summary: "Get one job posting (public)" })
  getJob(@Param("id", ParseIntPipe) id: number) {
    return this.hr.getJob(id);
  }

  @Post("jobs/:id/applications")
  @ApiOperation({
    summary: "Apply for a job; creates or reuses an applicant account",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: [
        "first_name",
        "last_name",
        "email",
        "phone",
        "password",
        "confirm_password",
      ],
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        cover_letter: { type: "string" },
        password: { type: "string" },
        confirm_password: { type: "string" },
        cv: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("cv", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async apply(
    @Param("id", ParseIntPipe) jobId: number,
    @Body() body: unknown,
    @UploadedFile() cv?: Express.Multer.File,
  ) {
    const dto = new ZodValidationPipe(applyJobSchema).transform(
      body,
    ) as ApplyJobDto;
    const cvUrl = cv?.buffer
      ? await this.cloudinary.uploadDocument(
          cv.buffer,
          "debridgers/hr-cvs",
          cv.originalname,
        )
      : undefined;
    return this.hr.apply(jobId, dto, cvUrl);
  }

  // === Applicant self-service (UI later)

  @Get("me/applications")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("applicant", "employee")
  @ApiOperation({ summary: "List my job applications" })
  myApplications(@CurrentUser() user: JwtPayload) {
    return this.hr.listMyApplications(user);
  }

  @Get("me/offers")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("applicant", "employee")
  @ApiOperation({ summary: "List offers for my applications" })
  myOffers(@CurrentUser() user: JwtPayload) {
    return this.hr.listMyOffers(user);
  }

  @Post("offers/:id/accept")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("applicant")
  @ApiOperation({
    summary: "Accept offer: role flips applicant → employee",
  })
  acceptOffer(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hr.acceptOffer(id, user);
  }

  @Post("offers/:id/reject")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("applicant")
  @ApiOperation({ summary: "Reject an offer" })
  rejectOffer(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hr.rejectOffer(id, user);
  }

  @Post("me/applications/:id/interviews")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("applicant")
  @ApiOperation({ summary: "Applicant books or reschedules their interview" })
  scheduleMyInterview(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = new ZodValidationPipe(scheduleInterviewSchema).transform(
      body,
    ) as ScheduleInterviewDto;
    return this.hr.scheduleInterviewAsApplicant(id, dto, user);
  }

  // === Admin staffing (hr_admin comes later as its own product surface)

  @Get("admin/jobs")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "List all job postings (HR)" })
  listJobsForHr() {
    return this.hr.listJobsForHr();
  }

  @Post("admin/jobs")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Create a job posting" })
  createJob(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = new ZodValidationPipe(createJobPostingSchema).transform(
      body,
    ) as CreateJobPostingDto;
    return this.hr.createJob(dto, user);
  }

  @Patch("admin/jobs/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Update a job posting" })
  updateJob(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
    const dto = new ZodValidationPipe(updateJobPostingSchema).transform(
      body,
    ) as UpdateJobPostingDto;
    return this.hr.updateJob(id, dto);
  }

  @Get("admin/applications")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "List applications, optionally by job_id" })
  listApplications(@Query("job_id") jobId?: string) {
    const parsed =
      jobId !== undefined && jobId !== "" ? Number(jobId) : undefined;
    if (parsed !== undefined && Number.isNaN(parsed)) {
      return this.hr.listApplications(undefined);
    }
    return this.hr.listApplications(parsed);
  }

  @Get("admin/applications/:id/cv")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary:
      "Signed Cloudinary URL for an applicant CV (public PDF links return 401)",
  })
  async applicationCv(@Param("id", ParseIntPipe) id: number) {
    const application = await this.hr.getApplication(id);
    if (!application.cv_url) {
      throw new NotFoundException("No CV uploaded for this application");
    }
    return { url: this.cloudinary.signedDownloadUrl(application.cv_url) };
  }

  @Patch("admin/applications/:id/screen")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Screen an application (pass / reject / screening)",
  })
  screenApplication(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(screenApplicationSchema).transform(
      body,
    ) as ScreenApplicationDto;
    return this.hr.screenApplication(id, dto);
  }

  @Post("admin/applications/:id/interviews")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Schedule an interview" })
  scheduleInterview(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(scheduleInterviewSchema).transform(
      body,
    ) as ScheduleInterviewDto;
    return this.hr.scheduleInterview(id, dto);
  }

  @Patch("admin/interviews/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Record interview feedback or reschedule" })
  updateInterview(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(interviewFeedbackSchema).transform(
      body,
    ) as InterviewFeedbackDto;
    return this.hr.updateInterview(id, dto);
  }

  @Post("admin/applications/:id/offers")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Create and email an offer letter" })
  createOffer(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = new ZodValidationPipe(createOfferSchema).transform(
      body,
    ) as CreateOfferDto;
    return this.hr.createOffer(id, dto, user);
  }

  @Post("admin/offers/:id/accept")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "HR marks offer accepted (applicant → employee)",
  })
  hrAcceptOffer(@Param("id", ParseIntPipe) id: number) {
    return this.hr.hrAcceptOffer(id);
  }

  // === People ops: directory

  @Get("directory")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Employee directory (search / filter)" })
  directory(
    @CurrentUser() user: JwtPayload,
    @Query("q") q?: string,
    @Query("department") department?: string,
    @Query("status") status?: string,
  ) {
    return this.people.listDirectory({ actor: user, q, department, status });
  }

  @Get("employees/me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "My employee profile" })
  myProfile(@CurrentUser() user: JwtPayload) {
    return this.people.getMyEmployeeProfile(user);
  }

  @Patch("employees/me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "Update my personal employee fields" })
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(updateMyEmployeeProfileSchema).transform(
      body,
    ) as UpdateMyEmployeeProfileDto;
    return this.people.updateMyProfile(user, dto);
  }

  @Get("employees/:userId")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "View an employee profile (RBAC)" })
  getEmployee(
    @Param("userId", ParseIntPipe) userId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.people.getEmployeeProfile(userId, user);
  }

  @Patch("admin/employees/:userId")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "HR admin: update employment record" })
  updateEmployeeAdmin(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(updateEmployeeAdminSchema).transform(
      body,
    ) as UpdateEmployeeAdminDto;
    return this.people.updateEmployeeAdmin(userId, dto);
  }

  // === Leave

  @Post("leave")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "Submit a leave request" })
  createLeave(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(createLeaveRequestSchema).transform(
      body,
    ) as CreateLeaveRequestDto;
    return this.people.createLeaveRequest(user, dto);
  }

  @Get("leave/me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "My leave requests" })
  myLeave(@CurrentUser() user: JwtPayload) {
    return this.people.listMyLeave(user);
  }

  @Get("admin/leave")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({
    summary: "Leave inbox: HR sees all; managers see direct reports",
  })
  leaveInbox(@CurrentUser() user: JwtPayload) {
    return this.people.listLeaveForReview(user);
  }

  @Patch("admin/leave/:id/review")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Approve or reject a leave request" })
  reviewLeave(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(reviewLeaveRequestSchema).transform(
      body,
    ) as ReviewLeaveRequestDto;
    return this.people.reviewLeave(id, user, dto);
  }

  // === Work activity reports

  @Post("work-reports")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "Create work activity report (draft or submit)" })
  createWorkReport(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(upsertWorkReportSchema).transform(
      body,
    ) as UpsertWorkReportDto;
    return this.people.saveWorkReport(user, dto);
  }

  @Patch("work-reports/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "Edit draft / revision-requested work report" })
  updateWorkReport(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(upsertWorkReportSchema).transform(
      body,
    ) as UpsertWorkReportDto;
    return this.people.updateWorkReport(id, user, dto);
  }

  @Get("work-reports/me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "My work activity reports" })
  myWorkReports(@CurrentUser() user: JwtPayload) {
    return this.people.listMyWorkReports(user);
  }

  @Get("admin/work-reports")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({
    summary: "Work report inbox: HR all; managers direct reports",
  })
  workReportInbox(@CurrentUser() user: JwtPayload) {
    return this.people.listWorkReportsForReview(user);
  }

  @Patch("admin/work-reports/:id/review")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Approve, reject, or request revision" })
  reviewWorkReport(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(reviewWorkReportSchema).transform(
      body,
    ) as ReviewWorkReportDto;
    return this.people.reviewWorkReport(id, user, dto);
  }

  // === Performance reviews / PIP / probation

  @Post("performance/reviews")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Create a performance or probation review" })
  createReview(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(createPerformanceReviewSchema).transform(
      body,
    ) as CreatePerformanceReviewDto;
    return this.ops.createReview(user, dto);
  }

  @Get("performance/reviews")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "List performance reviews visible to me" })
  listReviews(@CurrentUser() user: JwtPayload) {
    return this.ops.listReviews(user);
  }

  @Patch("performance/reviews/:id/self")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "Submit self-assessment" })
  submitSelfAssessment(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(selfAssessmentSchema).transform(
      body,
    ) as SelfAssessmentDto;
    return this.ops.submitSelfAssessment(id, user, dto);
  }

  @Patch("performance/reviews/:id/manager")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({
    summary: "Submit manager review (probation confirm/terminate)",
  })
  submitManagerReview(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(managerReviewSchema).transform(
      body,
    ) as ManagerReviewDto;
    return this.ops.submitManagerReview(id, user, dto);
  }

  @Post("performance/pips")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Open a performance improvement plan" })
  createPip(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(createPipSchema).transform(
      body,
    ) as CreatePipDto;
    return this.ops.createPip(user, dto);
  }

  @Get("performance/pips")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "List PIPs visible to me" })
  listPips(@CurrentUser() user: JwtPayload) {
    return this.ops.listPips(user);
  }

  @Patch("performance/pips/:id/close")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Close a PIP as passed or failed" })
  closePip(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(closePipSchema).transform(
      body,
    ) as ClosePipDto;
    return this.ops.closePip(id, user, dto);
  }

  // === Expenses

  @Post("expenses")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["description", "amount_kobo", "expense_date", "category"],
      properties: {
        description: { type: "string" },
        amount_kobo: { type: "number" },
        expense_date: { type: "string" },
        category: { type: "string" },
        receipt: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("receipt", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: "Submit an expense report (amount in kobo)" })
  async createExpense(
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    const raw =
      body && typeof body === "object"
        ? {
            ...(body as Record<string, unknown>),
            amount_kobo:
              typeof (body as Record<string, unknown>).amount_kobo === "string"
                ? Number((body as Record<string, unknown>).amount_kobo)
                : (body as Record<string, unknown>).amount_kobo,
          }
        : body;
    const dto = new ZodValidationPipe(createExpenseSchema).transform(
      raw,
    ) as CreateExpenseDto;
    const receiptUrl = receipt?.buffer
      ? await this.cloudinary.uploadDocument(
          receipt.buffer,
          "debridgers/hr-expenses",
          receipt.originalname,
        )
      : undefined;
    return this.ops.createExpense(user, dto, receiptUrl);
  }

  @Get("expenses/me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "My expense reports" })
  myExpenses(@CurrentUser() user: JwtPayload) {
    return this.ops.listMyExpenses(user);
  }

  @Get("admin/expenses")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Expense inbox: HR all; managers direct reports" })
  expenseInbox(@CurrentUser() user: JwtPayload) {
    return this.ops.listExpensesAdmin(user);
  }

  @Patch("admin/expenses/:id/review")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Approve, reject, or mark reimbursed" })
  reviewExpense(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(reviewExpenseSchema).transform(
      body,
    ) as ReviewExpenseDto;
    return this.ops.reviewExpense(id, user, dto);
  }

  // === Incidents

  @Post("incidents")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({
    summary: "Report an incident (critical emails HR_ALERT_EMAIL)",
  })
  createIncident(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(createIncidentSchema).transform(
      body,
    ) as CreateIncidentDto;
    return this.ops.createIncident(user, dto);
  }

  @Get("incidents")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "List incidents (HR all; others own reports)" })
  listIncidents(@CurrentUser() user: JwtPayload) {
    return this.ops.listIncidents(user);
  }

  @Patch("admin/incidents/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Update incident status / assignee" })
  updateIncident(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = new ZodValidationPipe(updateIncidentSchema).transform(
      body,
    ) as UpdateIncidentDto;
    return this.ops.updateIncident(id, user, dto);
  }

  // === Project status reports

  @Post("project-reports")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "Create or submit a project status report" })
  createProjectReport(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(createProjectReportSchema).transform(
      body,
    ) as CreateProjectReportDto;
    return this.ops.createProjectReport(user, dto);
  }

  @Get("project-reports/me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("employee")
  @ApiOperation({ summary: "My project status reports" })
  myProjectReports(@CurrentUser() user: JwtPayload) {
    return this.ops.listMyProjectReports(user);
  }

  @Get("admin/project-reports")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Project report inbox" })
  projectReportInbox(@CurrentUser() user: JwtPayload) {
    return this.ops.listProjectReportsAdmin(user);
  }

  @Patch("admin/project-reports/:id/approve")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Approve a project status report" })
  approveProjectReport(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ops.approveProjectReport(id, user);
  }

  // === Org chart

  @Get("org-chart")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Org chart nodes and roots" })
  orgChart() {
    return this.ops.orgChart();
  }

  // === Policies

  @Post("admin/policies")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Publish a policy" })
  createPolicy(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(createPolicySchema).transform(
      body,
    ) as CreatePolicyDto;
    return this.ops.createPolicy(user, dto);
  }

  @Get("policies")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "List policies (restricted hidden from non-HR)" })
  listPolicies(@CurrentUser() user: JwtPayload) {
    return this.ops.listPolicies(user);
  }

  @Get("policies/acknowledgments/me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "My policy acknowledgments" })
  myAcknowledgments(@CurrentUser() user: JwtPayload) {
    return this.ops.listMyAcknowledgments(user);
  }

  @Post("policies/:id/acknowledge")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiOperation({ summary: "Acknowledge a policy version" })
  acknowledgePolicy(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ops.acknowledgePolicy(id, user);
  }

  // === Jotform Sign tracking

  @Post("admin/sign-requests")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Track a Jotform Sign send (optional JOTFORM_SIGN_BASE_URL)",
  })
  createSignRequest(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = new ZodValidationPipe(createSignRequestSchema).transform(
      body,
    ) as CreateSignRequestDto;
    return this.ops.createSignRequest(user, dto);
  }

  @Get("sign-requests")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee", "applicant")
  @ApiOperation({ summary: "List sign requests (HR all; others own)" })
  listSignRequests(@CurrentUser() user: JwtPayload) {
    return this.ops.listSignRequests(user);
  }

  @Post("webhooks/jotform-sign")
  @ApiOperation({ summary: "Jotform Sign status webhook (public)" })
  jotformSignWebhook(@Body() body: unknown) {
    const dto = new ZodValidationPipe(signWebhookSchema).transform(
      body,
    ) as SignWebhookDto;
    return this.ops.handleSignWebhook(dto);
  }

  // === Employee docs

  @Patch("employees/:userId/docs")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        nin: { type: "string" },
        tax_id: { type: "string" },
        bank_account: { type: "string" },
        contract: { type: "string", format: "binary" },
        id_document: { type: "string", format: "binary" },
        certificates: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "contract", maxCount: 1 },
        { name: "id_document", maxCount: 1 },
        { name: "certificates", maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      },
    ),
  )
  @ApiOperation({
    summary: "Upload/update NIN, tax ID, bank, contract, ID, certificates",
  })
  async updateEmployeeDocs(
    @Param("userId", ParseIntPipe) userId: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
    @UploadedFiles()
    files?: {
      contract?: Express.Multer.File[];
      id_document?: Express.Multer.File[];
      certificates?: Express.Multer.File[];
    },
  ) {
    const dto = new ZodValidationPipe(uploadEmployeeDocsSchema).transform(
      body ?? {},
    ) as UploadEmployeeDocsDto;
    const contract = files?.contract?.[0];
    const idDoc = files?.id_document?.[0];
    const certs = files?.certificates ?? [];
    const urls: {
      contract_url?: string;
      id_document_url?: string;
      certificates_urls?: string;
    } = {};
    if (contract?.buffer) {
      urls.contract_url = await this.cloudinary.uploadDocument(
        contract.buffer,
        "debridgers/hr-docs",
        contract.originalname,
      );
    }
    if (idDoc?.buffer) {
      urls.id_document_url = await this.cloudinary.uploadDocument(
        idDoc.buffer,
        "debridgers/hr-docs",
        idDoc.originalname,
      );
    }
    if (certs.length) {
      const uploaded = await Promise.all(
        certs
          .filter((f) => f?.buffer)
          .map((f) =>
            this.cloudinary.uploadDocument(
              f.buffer,
              "debridgers/hr-docs",
              f.originalname,
            ),
          ),
      );
      if (uploaded.length) {
        urls.certificates_urls = JSON.stringify(uploaded);
      }
    }
    return this.ops.updateEmployeeDocs(userId, user, dto, urls);
  }

  // === Analytics

  @Get("admin/analytics")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "HR analytics: time-to-hire, conversion, headcount, queues",
  })
  analytics(@CurrentUser() user: JwtPayload) {
    return this.ops.analytics(user);
  }
}
