import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RatingsService } from "./ratings.service";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";
import {
  submitRatingSchema,
  type SubmitRatingDto,
} from "./dto/submit-rating.dto";
import { editRatingSchema, type EditRatingDto } from "./dto/edit-rating.dto";
import {
  disputeRatingSchema,
  type DisputeRatingDto,
} from "./dto/dispute-rating.dto";

@ApiTags("Ratings")
@Controller("ratings")
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth("access-token")
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("buyer", "agent")
  @ApiOperation({ summary: "Submit a rating for a delivered order" })
  async submit(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(submitRatingSchema)) dto: SubmitRatingDto,
  ) {
    const submission = await this.ratingsService.submitRating(user, dto);
    return {
      statusCode: 201,
      message: "Rating submitted",
      data: submission,
    };
  }

  @Get("pending")
  @HttpCode(HttpStatus.OK)
  @Roles("buyer", "agent")
  @ApiOperation({ summary: "Rating requests this user can still act on" })
  async pending(@CurrentUser() user: JwtPayload) {
    const pending = await this.ratingsService.listPending(user);
    return {
      statusCode: 200,
      message: "Pending ratings retrieved",
      data: pending,
    };
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @Roles("buyer", "agent")
  @ApiOperation({ summary: "Edit a rating within its edit window" })
  async edit(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(editRatingSchema)) dto: EditRatingDto,
  ) {
    const updated = await this.ratingsService.editRating(user, id, dto);
    return {
      statusCode: 200,
      message: "Rating updated",
      data: updated,
    };
  }

  @Post(":id/dispute")
  @HttpCode(HttpStatus.OK)
  @Roles("buyer", "agent")
  @ApiOperation({ summary: "Dispute a rating made about you" })
  async dispute(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(disputeRatingSchema)) dto: DisputeRatingDto,
  ) {
    const updated = await this.ratingsService.disputeRating(user, id, dto);
    return {
      statusCode: 200,
      message: "Rating disputed and flagged for review",
      data: updated,
    };
  }

  @Get("target/:type/:id")
  @HttpCode(HttpStatus.OK)
  @Roles("buyer", "agent", "admin")
  @ApiOperation({ summary: "A target's rating aggregate" })
  async targetAggregate(
    @CurrentUser() user: JwtPayload,
    @Param("type") type: string,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const aggregate = await this.ratingsService.getTargetAggregate(
      type,
      id,
      user,
    );
    return {
      statusCode: 200,
      message: "Rating aggregate retrieved",
      data: aggregate,
    };
  }
}
