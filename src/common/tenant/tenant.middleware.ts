import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ClsService } from 'nestjs-cls';
import { TenantService } from './tenant.service';
import { TenantClsStore } from './tenant-cls.interface';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly cls: ClsService<TenantClsStore>,
  ) {}

  async use(
    req: FastifyRequest['raw'],
    _res: FastifyReply['raw'],
    next: (err?: any) => void,
  ): Promise<void> {
    try {
      const slug = String(req.headers['x-clinic-slug'] ?? '')
        .trim()
        .toLowerCase();

      if (!slug) {
        return next(new NotFoundException('Missing x-clinic-slug header'));
      }

      const tenant = await this.tenantService.resolve(slug);

      if (!tenant) {
        return next(new NotFoundException(`Clinic not found: ${slug}`));
      }

      this.cls.set('schemaName', tenant.schemaName);
      this.cls.set('clinicId', tenant.id);

      next();
    } catch (err) {
      next(err);
    }
  }
}
