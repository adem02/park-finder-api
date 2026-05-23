import {
  Body,
  Controller,
  Delete,
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
import { ReportAvailabilityInputDto } from './dto/ReportAvailabilityInputDto';
import { ReportAvailabilityUseCase } from '../../application/report/ReportAvailability.use-case';
import { VoteQueryDto } from './dto/Vote.dto';
import { VoteUseCase } from '../../application/vote/Vote.use-case';
import { CancelVoteUseCase } from '../../application/vote/CancelVote.use-case';
import { CreateCommentInputDto } from './dto/CreateComment.dto';
import { CommentParkingUseCase } from '../../application/comment/CommentParking.use-case';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('parkings')
export class ParkingController {
  constructor(
    private readonly addNewParkingUseCase: AddNewParkingUseCase,
    private readonly getParkingDetailsUseCase: GetParkingDetailsUseCase,
    private readonly findNearbyParkingsUseCase: FindNearbyParkingsUseCase,
    private readonly reportAvailabilityUseCase: ReportAvailabilityUseCase,
    private readonly voteUseCase: VoteUseCase,
    private readonly cancelVoteUseCase: CancelVoteUseCase,
    private readonly commentUseCase: CommentParkingUseCase,
  ) {}

  @Post('new')
  @UseInterceptors(FilesInterceptor('photos', 3))
  @ApiOperation({ summary: 'Add a new parking with up to 3 photos' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Parking created successfully' })
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
  @ApiOperation({ summary: 'Get a parking details by its id' })
  @ApiParam({ name: 'id', description: 'Parking UUID' })
  @ApiResponse({ status: 200, type: GetParkingDetailsOutputDTO })
  @ApiResponse({ status: 404, description: 'Parking not found' })
  async getParkingDetails(@Param('id') id: string) {
    const response = await this.getParkingDetailsUseCase.execute({ id });

    return new GetParkingDetailsOutputDTO(response);
  }

  @Get('')
  @ApiOperation({ summary: 'Find nearby parkings around given coordinates' })
  @ApiResponse({ status: 200, type: FindNearbyParkingsOutputDto })
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

  @Post(':id/report')
  @ApiOperation({ summary: 'Report the current availability of a parking' })
  @ApiParam({ name: 'id', description: 'Parking UUID' })
  @ApiResponse({
    status: 201,
    description: 'Availability reported successfully',
  })
  @ApiResponse({ status: 404, description: 'Parking or user not found' })
  async reportAvailability(
    @Param('id') id: string,
    @GetUser() user: DecodedToken,
    @Body() body: ReportAvailabilityInputDto,
  ) {
    await this.reportAvailabilityUseCase.execute({
      reporterId: user.userId,
      parkingId: id,
      availableSpots: body.availableSpots,
    });
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Upvote or downvote a parking' })
  @ApiParam({ name: 'id', description: 'Parking UUID' })
  @ApiResponse({ status: 201, description: 'Vote registered successfully' })
  @ApiResponse({ status: 404, description: 'Parking or user not found' })
  async vote(
    @Param('id') id: string,
    @GetUser() user: DecodedToken,
    @Query() query: VoteQueryDto,
  ) {
    await this.voteUseCase.execute({
      userId: user.userId,
      parkingId: id,
      type: query.type,
    });
  }

  @Delete(':id/vote')
  @ApiOperation({ summary: 'Cancel the current user vote on a parking' })
  @ApiParam({ name: 'id', description: 'Parking UUID' })
  @ApiResponse({ status: 200, description: 'Vote cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Vote not found' })
  async deleteVote(@Param('id') id: string, @GetUser() user: DecodedToken) {
    await this.cancelVoteUseCase.execute({
      parkingId: id,
      userId: user.userId,
    });
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Post a comment on a parking' })
  @ApiParam({ name: 'id', description: 'Parking UUID' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 404, description: 'Parking or user not found' })
  async comment(
    @Param('id') id: string,
    @GetUser() user: DecodedToken,
    @Body() body: CreateCommentInputDto,
  ) {
    await this.commentUseCase.execute({
      userId: user.userId,
      parkingId: id,
      content: body.content,
    });
  }
}
