import { ApiProperty } from '@nestjs/swagger';
import { Comment } from '../../../domain/entities/Comment';

class CommentAuthorDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({
    example: 'https://cdn.example.com/photo.jpg',
    required: false,
  })
  photoUrl?: string;
}

export class CommentResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  readonly id: string;

  @ApiProperty({ example: 'Très bon parking, sûr et bien éclairé.' })
  readonly content: string;

  @ApiProperty({ type: CommentAuthorDto })
  readonly author: CommentAuthorDto;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty({ required: false })
  readonly updatedAt?: Date;

  constructor(comment: Comment) {
    const { author } = comment;
    this.id = comment.id;
    this.content = comment.content;
    this.author = {
      id: author.id,
      username: author.username,
      photoUrl: author.photoUrl,
    };
    this.createdAt = comment.createdAt;
    this.updatedAt = comment.updatedAt;
  }
}
