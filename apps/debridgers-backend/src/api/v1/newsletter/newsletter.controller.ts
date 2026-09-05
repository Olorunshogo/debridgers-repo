import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { NewsletterService } from "./newsletter.service";
import {
  subscribeNewsletterSchema,
  SubscribeNewsletterDto,
} from "./dto/subscribe-newsletter.dto";
import { ZodValidationPipe } from "../../../infrastructure/pipeline/validation.pipeline";

@ApiTags("Newsletter")
@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Subscribe an email to the newsletter" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", example: "chukwudi@example.com" },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Subscribed successfully",
    schema: {
      example: {
        statusCode: 201,
        message: "Subscribed! Watch your inbox for market updates.",
        data: null,
        timestamp: "2026-04-07T10:00:00.000Z",
        version: "v1",
        path: "/api/v1/newsletter",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Validation failed" })
  @ApiResponse({ status: 409, description: "Email already subscribed" })
  @UsePipes(new ZodValidationPipe(subscribeNewsletterSchema))
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }
}
