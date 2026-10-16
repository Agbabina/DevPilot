import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { userId?: number } }>();
    const userId = request.user?.userId;
    const allowedIds = (this.config.get<string>('ADMIN_USER_IDS') ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (!userId || !allowedIds.includes(userId)) {
      throw new ForbiddenException('Administrator access required');
    }
    return true;
  }
}
