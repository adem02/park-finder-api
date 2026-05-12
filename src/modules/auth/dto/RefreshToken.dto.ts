import { RefreshTokenResponse } from '../../../application/auth/RefreshToken.use-case';

export class RefreshTokenOutputDTO {
  readonly accessToken: string;

  constructor(response: RefreshTokenResponse) {
    this.accessToken = response.accessToken;
  }
}
