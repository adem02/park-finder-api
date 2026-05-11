import { OAuthResponse } from '../../../application/auth/OAuth.use-case';

export class OAuthOutputDTO {
  readonly user: {
    id: string;
    username: string;
    email?: string;
    photoUrl?: string;
  };

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
