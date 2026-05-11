import { registerAs } from '@nestjs/config';

export default registerAs('apple', () => ({
  clientId: process.env.APPLE_CLIENT_ID as string,
  teamId: process.env.APPLE_TEAM_ID as string,
  keyId: process.env.APPLE_KEY_ID as string,
  privateKey: process.env.APPLE_PRIVATE_KEY as string,
  callbackUrl: process.env.APPLE_CALLBACK_URL as string,
}));
