import { Module } from '@nestjs/common';
import { AddNewParkingUseCase } from '../../application/parking/AddNewParking.use-case';
import {
  PARKING_REPOSITORY,
  STORAGE_SERVICE,
  USER_REPOSITORY,
} from '../../common/constants/injection-tokens.constants';
import { PrismaParkingRepository } from '../../infrastructure/orm/repositories/PrismaParking.repository';
import { PrismaUserRepository } from '../../infrastructure/orm/repositories/PrismaUser.repository';
import { CloudinaryStorageService } from '../../infrastructure/cloudinary/CloudinaryStorage.service';
import { ParkingController } from './parking.controller';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

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
    AddNewParkingUseCase,
  ],
})
export class ParkingModule {}
