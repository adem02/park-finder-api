import { Injectable } from '@nestjs/common';
import { AppLogger } from './common/logger/app-logger.service';

@Injectable()
export class AppService {
  constructor(private readonly logger: AppLogger) {}

  getHello(): string {
    this.logger.log('Hello world service method called');
    return 'Hello World!';
  }
}
