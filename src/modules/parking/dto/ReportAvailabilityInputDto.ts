import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportAvailabilityInputDto {
  @ApiProperty({ example: 10, minimum: 1 })
  @IsNumber()
  @Min(1)
  availableSpots: number;
}
