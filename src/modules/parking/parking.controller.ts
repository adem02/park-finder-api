import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AddNewParkingUseCase } from '../../application/parking/AddNewParking.use-case';
import { NewParkingInputDto } from './dto/NewParking.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { DecodedToken } from '../../application/types/auth.types';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { ParkingPhoto } from '../../application/types/parking.types';
import { FileValidationPipe } from '../../common/pipes/FileValidation.pipe';

@Controller('parkings')
export class ParkingController {
  constructor(private readonly addNewParkingUseCase: AddNewParkingUseCase) {}

  @Post('new')
  @UseInterceptors(FilesInterceptor('photos', 3))
  async addNewParking(
    @GetUser() user: DecodedToken,
    @Body() body: NewParkingInputDto,
    @UploadedFiles(new FileValidationPipe()) files: Array<Express.Multer.File>,
  ) {
    const photos: ReadonlyArray<ParkingPhoto> = files.map((file) => ({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    }));

    const response = await this.addNewParkingUseCase.execute({
      ...body,
      photos,
      userId: user.userId,
    });

    return response;
  }
}
