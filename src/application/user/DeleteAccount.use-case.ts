import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens.constants';
import type { UserRepository } from '../gateway/User.repository';
import { SYSTEM_USER } from '../../domain/constants/user.constants';
import { ResourceNotFoundException } from '../../domain/exceptions/ResourceNotFound.exception';
import { SystemAccountDeletionException } from '../../domain/exceptions/SystemAccountDeletion.exception';

export interface DeleteAccountRequest {
  userId: string;
}

/**
 * Deletes the user's account by anonymizing it (GDPR right to erasure): personal data, comments,
 * badges, points and sessions go away; parkings move to the PlaceGratos system account; votes and
 * availability reports stay, anonymous, so the community's parking scores are untouched.
 * The access token stays valid until it expires (15 min), like after a logout, but it can no
 * longer be renewed.
 */
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(request: DeleteAccountRequest): Promise<void> {
    if (request.userId === SYSTEM_USER.id) {
      throw new SystemAccountDeletionException();
    }

    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      throw new ResourceNotFoundException(
        `User with ID ${request.userId} not found.`,
      );
    }

    await this.userRepository.anonymize(user.id, SYSTEM_USER);
  }
}
