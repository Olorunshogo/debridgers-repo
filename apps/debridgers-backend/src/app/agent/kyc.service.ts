import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { JwtPayload } from "../../interfaces/users/jwt.type";
import { SubmitKycDto } from "./dto/submit-kyc.dto";

@Injectable()
export class KycService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async submitKyc(
    dto: SubmitKycDto,
    user: JwtPayload,
    files: { id_front?: string; id_selfie?: string },
  ) {
    const [profile] = await this.db
      .select()
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, user.sub))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent profile not found");

    if (profile.status !== "approved") {
      throw new BadRequestException(
        "Your application must be approved before submitting KYC",
      );
    }

    if (
      profile.kyc_status === "submitted" ||
      profile.kyc_status === "approved"
    ) {
      throw new BadRequestException(
        "KYC already submitted or approved. Contact support to resubmit.",
      );
    }

    if (!files.id_front || !files.id_selfie) {
      throw new BadRequestException(
        "Both ID document and selfie photo are required",
      );
    }

    await this.db
      .update(schema.agent_profiles)
      .set({
        id_type: dto.id_type,
        id_front_url: files.id_front,
        id_selfie_url: files.id_selfie,
        bank_name: dto.bank_name,
        bank_account_number: dto.bank_account_number,
        bank_account_name: dto.bank_account_name,
        kyc_status: "submitted",
        kyc_rejection_reason: null,
      })
      .where(eq(schema.agent_profiles.user_id, user.sub));

    return {
      message:
        "KYC submitted successfully. We will review and get back to you.",
      data: null,
    };
  }

  async getKycStatus(user: JwtPayload) {
    const [profile] = await this.db
      .select({
        kyc_status: schema.agent_profiles.kyc_status,
        kyc_rejection_reason: schema.agent_profiles.kyc_rejection_reason,
        id_type: schema.agent_profiles.id_type,
        bank_name: schema.agent_profiles.bank_name,
        bank_account_name: schema.agent_profiles.bank_account_name,
      })
      .from(schema.agent_profiles)
      .where(eq(schema.agent_profiles.user_id, user.sub))
      .limit(1);

    if (!profile) throw new NotFoundException("Agent profile not found");

    return { message: "KYC status retrieved", data: profile };
  }
}
