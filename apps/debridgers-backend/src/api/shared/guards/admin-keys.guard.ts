import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class AdminKeysGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key1 = request.headers["x-admin-key-1"];
    const key2 = request.headers["x-admin-key-2"];

    if (!key1 || !key2) {
      throw new ForbiddenException("Missing admin authentication keys");
    }

    const validKey1 = process.env.ADMIN_KEY_1;
    const validKey2 = process.env.ADMIN_KEY_2;

    if (key1 !== validKey1 || key2 !== validKey2) {
      throw new ForbiddenException("Invalid admin keys");
    }

    return true;
  }
}
