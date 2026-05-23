import { ApiProperty } from '@nestjs/swagger';
import { OAuthResponse } from '../../../application/auth/OAuth.use-case';

export class OAuthOutputDTO {
  @ApiProperty({
    example: { id: 'a1b2c3', username: 'johndoe', email: 'john@example.com' },
  })
  readonly user: {
    id: string;
    username: string;
    email?: string;
    photoUrl?: string;
  };

  @ApiProperty({ example: 'eyJhbGci...' })
  readonly accessToken: string;

  constructor(response: OAuthResponse) {
    this.user = {
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      photoUrl: response.user.photoUrl,
    };
    this.accessToken = response.accessToken;
  }
}
