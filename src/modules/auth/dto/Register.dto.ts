import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { RegisterResponse } from '../../../application/auth/Register.use-case';

export class RegisterInputDTO {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;
}

export class RegisterOutputDTO {
  readonly user: {
    id: string;
    username: string;
    email?: string;
    photoUrl?: string;
  };
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
