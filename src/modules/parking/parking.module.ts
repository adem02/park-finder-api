import { Module } from '@nestjs/common';
import { AddNewParkingUseCase } from '../../application/parking/AddNewParking.use-case';
import {
  AVAILABILITY_REPOSITORY,
  COMMENT_REPOSITORY,
  PARKING_REPOSITORY,
  STORAGE_SERVICE,
  USER_REPOSITORY,
  VOTE_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import { DrizzleParkingRepository } from '../../infrastructure/orm/repositories/DrizzleParking.repository';
import { DrizzleUserRepository } from '../../infrastructure/orm/repositories/DrizzleUser.repository';
import { CloudinaryStorageService } from '../../infrastructure/cloudinary/CloudinaryStorage.service';
import { ParkingController } from './parking.controller';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GetParkingDetailsUseCase } from '../../application/parking/GetParkingDetails.use-case';
import { FindNearbyParkingsUseCase } from '../../application/parking/FindNearbyParkings.use-case';
import { DrizzleAvailabilityRepository } from '../../infrastructure/orm/repositories/DrizzleAvailability.repository';
import { ReportAvailabilityUseCase } from '../../application/report/ReportAvailability.use-case';
import { DrizzleVoteRepository } from '../../infrastructure/orm/repositories/DrizzleVote.repository';
import { VoteUseCase } from '../../application/vote/Vote.use-case';
import { CancelVoteUseCase } from '../../application/vote/CancelVote.use-case';
import { CommentParkingUseCase } from '../../application/comment/CommentParking.use-case';
import { ListParkingCommentsUseCase } from '../../application/comment/ListParkingComments.use-case';
import { DrizzleCommentRepository } from '../../infrastructure/orm/repositories/DrizzleComment.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
    UserModule,
  ],
  controllers: [ParkingController],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: CloudinaryStorageService,
    },
    {
      provide: PARKING_REPOSITORY,
      useClass: DrizzleParkingRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },
    {
      provide: AVAILABILITY_REPOSITORY,
      useClass: DrizzleAvailabilityRepository,
    },
    {
      provide: VOTE_REPOSITORY,
      useClass: DrizzleVoteRepository,
    },
    {
      provide: COMMENT_REPOSITORY,
      useClass: DrizzleCommentRepository,
    },
    AddNewParkingUseCase,
    GetParkingDetailsUseCase,
    FindNearbyParkingsUseCase,
    ReportAvailabilityUseCase,
    VoteUseCase,
    CancelVoteUseCase,
    CommentParkingUseCase,
    ListParkingCommentsUseCase,
  ],
})
export class ParkingModule {}
