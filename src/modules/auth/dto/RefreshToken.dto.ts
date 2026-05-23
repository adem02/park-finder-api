import { ApiProperty } from '@nestjs/swagger';
import { RefreshTokenResponse } from '../../../application/auth/RefreshToken.use-case';

export class RefreshTokenOutputDTO {
  @ApiProperty({ example: 'eyJhbGci...' })
  readonly accessToken: string;

  constructor(response: RefreshTokenResponse) {
    this.accessToken = response.accessToken;
  }
}
