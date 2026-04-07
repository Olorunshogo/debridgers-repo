import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { ContactService } from "./contact.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import {
  createContactSchema,
  CreateContactDto,
} from "./dto/create-contact.dto";

@ApiTags("Contact")
@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Submit a contact / lead form from the landing page",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["full_name", "email", "message"],
      properties: {
        full_name: { type: "string", example: "Chukwudi Obi" },
        email: { type: "string", example: "chukwudi@example.com" },
        message: {
          type: "string",
          example: "I'd like to order weekly for my restaurant.",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Lead saved successfully",
    schema: {
      example: {
        statusCode: 201,
        message: "Thank you! We'll be in touch soon.",
        data: null,
        timestamp: "2026-04-07T10:00:00.000Z",
        version: "v1",
        path: "/api/v1/contact",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Validation failed" })
  @UsePipes(new ZodValidationPipe(createContactSchema))
  submit(@Body() dto: CreateContactDto) {
    return this.contactService.submit(dto);
  }
}
