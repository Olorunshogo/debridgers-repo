import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class RequestKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const requestKey = request.headers["x-request-key"];

    if (!requestKey) {
      throw new ForbiddenException("Missing request authentication key");
    }

    const validKey = process.env.REQUEST_KEY;

    if (requestKey !== validKey) {
      throw new ForbiddenException("Invalid request key");
    }

    return true;
  }
}
