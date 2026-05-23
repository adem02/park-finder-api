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
import { PrismaParkingRepository } from '../../infrastructure/orm/repositories/PrismaParking.repository';
import { PrismaUserRepository } from '../../infrastructure/orm/repositories/PrismaUser.repository';
import { CloudinaryStorageService } from '../../infrastructure/cloudinary/CloudinaryStorage.service';
import { ParkingController } from './parking.controller';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GetParkingDetailsUseCase } from '../../application/parking/GetParkingDetails.use-case';
import { FindNearbyParkingsUseCase } from '../../application/parking/FindNearbyParkings.use-case';
import { PrismaAvailabilityRepository } from '../../infrastructure/orm/repositories/PrismaAvailability.repository';
import { ReportAvailabilityUseCase } from '../../application/report/ReportAvailability.use-case';
import { PrismaVoteRepository } from '../../infrastructure/orm/repositories/PrismaVote.repository';
import { VoteUseCase } from '../../application/vote/Vote.use-case';
import { CancelVoteUseCase } from '../../application/vote/CancelVote.use-case';
import { CommentParkingUseCase } from '../../application/comment/CommentParking.use-case';
import { PrismaCommentRepository } from '../../infrastructure/orm/repositories/PrismaComment.repository';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [ParkingController],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: CloudinaryStorageService,
    },
    {
      provide: PARKING_REPOSITORY,
      useClass: PrismaParkingRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: AVAILABILITY_REPOSITORY,
      useClass: PrismaAvailabilityRepository,
    },
    {
      provide: VOTE_REPOSITORY,
      useClass: PrismaVoteRepository,
    },
    {
      provide: COMMENT_REPOSITORY,
      useClass: PrismaCommentRepository,
    },
    AddNewParkingUseCase,
    GetParkingDetailsUseCase,
    FindNearbyParkingsUseCase,
    ReportAvailabilityUseCase,
    VoteUseCase,
    CancelVoteUseCase,
    CommentParkingUseCase,
  ],
})
export class ParkingModule {}
