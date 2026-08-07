import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class PaymentKeysGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const paymentKey1 = request.headers["x-payment-key"];
    const paymentKey2 = request.headers["x-payment-key_2"];

    if (!paymentKey1 || !paymentKey2) {
      throw new ForbiddenException("Missing payment authentication keys");
    }

    const validKey1 = process.env.PAYMENT_KEY_1;
    const validKey2 = process.env.PAYMENT_KEY_2;

    if (paymentKey1 !== validKey1 || paymentKey2 !== validKey2) {
      throw new ForbiddenException("Invalid payment keys");
    }

    return true;
  }
}
