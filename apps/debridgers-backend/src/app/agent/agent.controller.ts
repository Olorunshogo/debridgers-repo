import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AgentService } from "./agent.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import { applyAgentSchema, ApplyAgentDto } from "./dto/apply-agent.dto";
import { submitReportSchema, SubmitReportDto } from "./dto/submit-report.dto";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../../interfaces/users/jwt.type";

@Controller("agent")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post("apply")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("cv"))
  async apply(@Body() body: unknown, @UploadedFile() cv?: Express.Multer.File) {
    const dto = new ZodValidationPipe(applyAgentSchema).transform(body);
    const cvUrl = (cv as (Express.Multer.File & { path?: string }) | undefined)
      ?.path;
    return this.agentService.apply(dto as ApplyAgentDto, cvUrl);
  }

  @Get("me")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.agentService.getProfile(user);
  }

  @Post("report")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  @UsePipes(new ZodValidationPipe(submitReportSchema))
  submitReport(@Body() dto: SubmitReportDto, @CurrentUser() user: JwtPayload) {
    return this.agentService.submitReport(dto, user);
  }

  @Get("reports")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  getReports(@CurrentUser() user: JwtPayload) {
    return this.agentService.getReports(user);
  }

  @Get("commissions")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("agent")
  getCommissions(@CurrentUser() user: JwtPayload) {
    return this.agentService.getCommissions(user);
  }
}
