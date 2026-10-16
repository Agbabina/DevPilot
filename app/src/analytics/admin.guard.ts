import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const email = String(request.user?.email || '').trim().toLowerCase();
    const admins = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (!email || admins.length === 0 || !admins.includes(email)) {
      throw new ForbiddenException('Administrator access is required.');
    }
    return true;
  }
}
