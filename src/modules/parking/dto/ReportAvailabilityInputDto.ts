import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportAvailabilityInputDto {
  @ApiProperty({ example: 10, minimum: 0 })
  @IsNumber()
  @Min(0)
  availableSpots: number;
}
