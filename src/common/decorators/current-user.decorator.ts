import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  clinicId: string;
  roles: AppRole[];
  email: string;
}

export interface RequestWithUser extends Request {
  user: AuthUser;
}

import { AppRole } from '@common/rbac/roles.decorator';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user,
);
