import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

export interface KeysGuardConfig {
  keys: string[];
  requireJwt?: boolean;
}

class BaseKeysGuard implements CanActivate {
  constructor(protected config: KeysGuardConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (this.config.requireJwt && !request.user) {
      throw new ForbiddenException("Missing JWT token");
    }

    for (const keyName of this.config.keys) {
      const headerName = this.getHeaderName(keyName);
      const providedKey = request.headers[headerName];
      const validKey = process.env[this.getEnvVar(keyName)];

      if (!providedKey) {
        throw new ForbiddenException(`Missing key: ${keyName}`);
      }

      if (providedKey !== validKey) {
        throw new ForbiddenException(`Invalid key: ${keyName}`);
      }
    }

    return true;
  }

  protected getHeaderName(keyName: string): string {
    const map: Record<string, string> = {
      admin1: "x-admin-key-1",
      admin2: "x-admin-key-2",
      payment1: "x-payment-key",
      payment2: "x-payment-key_2",
      request: "x-request-key",
    };
    return map[keyName] || keyName.toLowerCase();
  }

  protected getEnvVar(keyName: string): string {
    const map: Record<string, string> = {
      admin1: "ADMIN_KEY_1",
      admin2: "ADMIN_KEY_2",
      payment1: "PAYMENT_KEY_1",
      payment2: "PAYMENT_KEY_2",
      request: "REQUEST_KEY",
    };
    return map[keyName] || `KEY_${keyName.toUpperCase()}`;
  }
}

@Injectable()
export class AdminKeysGuard extends BaseKeysGuard {
  constructor() {
    super({ keys: ["admin1", "admin2"] });
  }
}

@Injectable()
export class PaymentKeysGuard extends BaseKeysGuard {
  constructor() {
    super({ keys: ["payment1", "payment2"], requireJwt: true });
  }
}

@Injectable()
export class RequestKeyGuard extends BaseKeysGuard {
  constructor() {
    super({ keys: ["request"], requireJwt: true });
  }
}

@Injectable()
export class BuyerPaymentKeysGuard extends BaseKeysGuard {
  constructor() {
    super({ keys: ["request", "payment1", "payment2"], requireJwt: true });
  }
}
