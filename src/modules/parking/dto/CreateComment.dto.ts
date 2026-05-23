import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content!: string;
}
