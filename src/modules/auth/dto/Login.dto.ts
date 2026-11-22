import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { LoginResponse } from '../../../application/auth/Login.use-case';

export class LoginInputDTO {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  password!: string;
}

export class LoginOutputDTO {
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

  constructor(response: LoginResponse) {
    this.user = {
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      photoUrl: response.user.photoUrl,
    };
    this.accessToken = response.accessToken;
  }
}
