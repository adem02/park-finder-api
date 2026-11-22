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
import { ApiProperty } from '@nestjs/swagger';

class CoordinatesDTO {
  @ApiProperty({ example: 48.8566, minimum: -90, maximum: 90 })
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 2.3522, minimum: -180, maximum: 180 })
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class NewParkingInputDto {
  @ApiProperty({ example: 'Parking Centrale', minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 50, minimum: 1, maximum: 1000 })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  totalSpots!: number;

  @ApiProperty({ type: CoordinatesDTO })
  @ValidateNested()
  @Transform(({ value }) =>
    plainToInstance(
      CoordinatesDTO,
      typeof value === 'string' ? (JSON.parse(value) as object) : value,
    ),
  )
  coordinates!: CoordinatesDTO;
}
