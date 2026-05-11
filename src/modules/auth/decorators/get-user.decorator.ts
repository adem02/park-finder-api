import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { DecodedToken } from '../../../application/types/auth.types';

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DecodedToken => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return request.user as DecodedToken;
  },
);
