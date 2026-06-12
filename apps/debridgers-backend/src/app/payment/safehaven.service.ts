import * as crypto from "crypto";
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface TokenCache {
  value: string;
  expiresAt: number;
}

interface SafeHavenTransferPayload {
  nameEnquirySessionId: string;
  beneficiaryBankCode: string;
  beneficiaryAccountNumber: string;
  amount: number;
  narration: string;
  paymentReference: string;
}

@Injectable()
export class SafeHavenService {
  private readonly logger = new Logger(SafeHavenService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly ibsClientId: string;
  private readonly debitAccountNumber: string;
  private readonly callbackUrl: string;

  private tokenCache: TokenCache | null = null;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>("SafeHavenConfig.baseUrl") ?? "";
    this.clientId = this.config.get<string>("SafeHavenConfig.clientId") ?? "";
    this.ibsClientId =
      this.config.get<string>("SafeHavenConfig.ibsClientId") ?? "";
    this.debitAccountNumber =
      this.config.get<string>("SafeHavenConfig.debitAccountNumber") ?? "";
    this.callbackUrl =
      this.config.get<string>("SafeHavenConfig.callbackUrl") ?? "";
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.value;
    }

    const res = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_assertion: this.ibsClientId,
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      }),
    });

    if (!res.ok) {
      this.logger.error(`SafeHaven auth failed: ${res.status}`);
      throw new UnauthorizedException("SafeHaven authentication failed");
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.tokenCache = {
      value: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };

    return data.access_token;
  }

  // ─── Internal fetch helper ─────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ClientID: this.ibsClientId,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await res.json()) as T;

    if (!res.ok) {
      const msg =
        (data as Record<string, unknown>)?.message ?? "SafeHaven API error";
      this.logger.error(`SafeHaven ${method} ${path} → ${res.status}: ${msg}`);
      throw new ServiceUnavailableException(`SafeHaven: ${msg}`);
    }

    return data;
  }

  // ─── Bank list ─────────────────────────────────────────────────────────────

  async getBanks(): Promise<{ bankCode: string; name: string }[]> {
    const data = await this.request<{
      data: { bankCode: string; name: string }[];
    }>("GET", "/banks");
    return data.data;
  }

  // ─── Name enquiry (account verification) ──────────────────────────────────

  async nameEnquiry(
    bankCode: string,
    accountNumber: string,
  ): Promise<{ sessionId: string; accountName: string }> {
    const data = await this.request<{
      data: { sessionId: string; accountName: string };
    }>("POST", "/account/name-enquiry", { bankCode, accountNumber });
    return data.data;
  }

  // ─── Virtual account (order payment collection) ────────────────────────────

  async createVirtualAccount(opts: {
    amountKobo: number;
    validForSeconds: number;
    externalReference: string;
  }): Promise<{
    accountNumber: string;
    accountName: string;
    bankName: string;
    expiresAt: Date;
  }> {
    // SafeHaven expects amount in naira (not kobo)
    const amountNaira = opts.amountKobo / 100;

    const data = await this.request<{
      data: {
        accountNumber: string;
        accountName: string;
        bankName: string;
      };
    }>("POST", "/virtual-account/initialize", {
      validFor: opts.validForSeconds,
      callbackUrl: this.callbackUrl,
      amount: amountNaira,
      amountControl: "Fixed",
      externalReference: opts.externalReference,
      accountNumber: this.debitAccountNumber,
    });

    return {
      ...data.data,
      expiresAt: new Date(Date.now() + opts.validForSeconds * 1000),
    };
  }

  // ─── Transfer (agent payout) ───────────────────────────────────────────────

  async transfer(payload: SafeHavenTransferPayload): Promise<{
    reference: string;
    status: string;
  }> {
    const data = await this.request<{
      data: { reference: string; status: string };
      responseCode?: string;
      message?: string;
    }>("POST", "/transfers", {
      ...payload,
      debitAccountNumber: this.debitAccountNumber,
    });

    // SafeHaven returns responseCode '00' for success
    if (data.responseCode && data.responseCode !== "00") {
      throw new BadRequestException(data.message ?? "Transfer failed");
    }

    return data.data;
  }

  // ─── Webhook verification ──────────────────────────────────────────────────

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret =
      this.config.get<string>("SafeHavenConfig.webhookSecret") ?? "";
    const expected = crypto
      .createHmac("sha512", secret)
      .update(payload)
      .digest("hex");
    return expected === signature;
  }
}
