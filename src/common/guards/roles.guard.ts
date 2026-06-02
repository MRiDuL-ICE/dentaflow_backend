import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AppRole } from '@common/rbac/roles.decorator';

interface RequestWithUser {
  user: {
    roles: AppRole[];
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user?.roles?.some((r: AppRole) => required.includes(r)))
      throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
