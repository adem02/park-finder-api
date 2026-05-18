import { IsNumber, Min } from 'class-validator';

export class ReportAvailabilityInputDto {
  @IsNumber()
  @Min(1)
  availableSpots: number;
}
