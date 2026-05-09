import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../../domain/exceptions/Domain.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(422).json({
      statusCode: 422,
      message: exception.message,
      error: exception.name,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
