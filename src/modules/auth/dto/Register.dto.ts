import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { RegisterResponse } from '../../../application/auth/Register.use-case';

export class RegisterInputDTO {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'P@ssw0rd!', minLength: 6, maxLength: 20 })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password!: string;

  @ApiProperty({ example: 'johndoe', minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;
}

export class RegisterOutputDTO {
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

  constructor(response: RegisterResponse) {
    this.user = {
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      photoUrl: response.user.photoUrl,
    };
    this.accessToken = response.accessToken;
  }
}
