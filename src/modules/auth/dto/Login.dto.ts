import { IsEmail, IsString } from 'class-validator';
import type { LoginResponse } from '../../../application/auth/Login.use-case';

export class LoginInputDTO {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
export class LoginOutputDTO {
  readonly user: {
    id: string;
    username: string;
    email?: string;
    photoUrl?: string;
  };
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
