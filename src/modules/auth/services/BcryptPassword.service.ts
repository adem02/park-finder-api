import * as bcrypt from 'bcrypt';
import { PasswordService } from '../../../application/gateway/Password.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BcryptPasswordService implements PasswordService {
  async hash(password: string) {
    const saltOrRounds = 10;

    return bcrypt.hash(password, saltOrRounds);
  }

  async compare(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }
}
