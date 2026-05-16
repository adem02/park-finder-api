import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { GetParkingDetailsUseCase } from '../../application/parking/GetParkingDetails.use-case';
import { GetParkingDetailsOutputDTO } from './dto/GetParkingDetails.dto';
import {
  FindNearbyParkingsOutputDto,
  FindNearbyParkingsQueryDto,
} from './dto/FindNearbyParkings.dto';
import { FindNearbyParkingsUseCase } from '../../application/parking/FindNearbyParkings.use-case';

@Controller('parkings')
export class ParkingController {
  constructor(
    private readonly addNewParkingUseCase: AddNewParkingUseCase,
    private readonly getParkingDetailsUseCase: GetParkingDetailsUseCase,
    private readonly findNearbyParkingsUseCase: FindNearbyParkingsUseCase,
  ) {}

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

  @Get(':id')
  async getParkingDetails(@Param('id') id: string) {
    const response = await this.getParkingDetailsUseCase.execute({ id });

    return new GetParkingDetailsOutputDTO(response);
  }

  @Get()
  async findNearBy(@Query() query: FindNearbyParkingsQueryDto) {
    const response = await this.findNearbyParkingsUseCase.execute({
      coordinates: {
        latitude: query.lat,
        longitude: query.lng,
      },
      radius: query.radius ?? 500,
    });

    return new FindNearbyParkingsOutputDto(response);
  }
}
