import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppRole } from '../rbac/roles.decorator';
import { RequestWithUser } from '../permissions/request-with-user.interface';

export interface AuthUser {
  id: string;
  clinicId: string;
  roles: AppRole[];
  email?: string;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user,
);
