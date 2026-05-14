import {
  BadRequestException,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  private readonly logger = new Logger(CatchEverythingFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const request = ctx.getRequest<Request>();
    const message =
      exception instanceof BadRequestException
        ? exception.getResponse()
        : exception instanceof HttpException
          ? exception.message
          : 'Internal server error';

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode: httpStatus,
        message,
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(request) as string,
      },
      httpStatus,
    );
  }
}
