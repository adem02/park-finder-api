import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CoordinatesDTO {
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class NewParkingInputDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  totalSpots!: number;

  @ValidateNested()
  @Transform(({ value }) =>
    plainToInstance(
      CoordinatesDTO,
      typeof value === 'string' ? (JSON.parse(value) as object) : value,
    ),
  )
  coordinates!: CoordinatesDTO;
}
