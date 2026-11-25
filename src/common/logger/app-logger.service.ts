import {
  ConsoleLogger,
  Inject,
  Injectable,
  Optional,
  Scope,
} from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';
import { loggerOptionsFromEnv } from './logger-options';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  constructor(
    @Optional()
    @Inject(INQUIRER)
    private readonly parentClass: object,
  ) {
    super('Application', loggerOptionsFromEnv());

    const context =
      this.parentClass?.constructor?.name &&
      this.parentClass.constructor.name !== 'Object'
        ? this.parentClass.constructor.name
        : 'Application';

    this.setContext(context);
  }
}
