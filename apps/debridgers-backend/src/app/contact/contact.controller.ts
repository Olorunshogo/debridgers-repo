import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
} from "@nestjs/common";
import { ContactService } from "./contact.service";
import { ZodValidationPipe } from "../../infrastructure/pipeline/validation.pipeline";
import {
  createContactSchema,
  CreateContactDto,
} from "./dto/create-contact.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createContactSchema))
  submit(@Body() dto: CreateContactDto) {
    return this.contactService.submit(dto);
  }
}
