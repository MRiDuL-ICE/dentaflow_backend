import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface WrappedResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, WrappedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<WrappedResponse<T>> {
    const status = context.switchToHttp().getResponse().statusCode as number;

    return next.handle().pipe(
      map((data) => ({
        statusCode: status,
        message: 'success',
        data,
      })),
    );
  }
}
