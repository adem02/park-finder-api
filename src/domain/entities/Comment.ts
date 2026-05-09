import { Parking } from './Parking';
import { User } from './User';
import { InvalidCommentContentLengthException } from '../exceptions/InvalidCommentContentLength.exception';

interface CommentParams {
  id: string;
  content: string;
  parking: Parking;
  author: User;
  createdAt: Date;
  updatedAt?: Date;
}

export class Comment {
  private constructor(
    readonly id: string,
    readonly content: string,
    readonly parking: Parking,
    readonly author: User,
    readonly createdAt: Date,
    readonly updatedAt?: Date,
  ) {}

  static create(params: CommentParams) {
    if (params.content.length < 1 || params.content.length > 500) {
      throw new InvalidCommentContentLengthException(
        'Comment content length must be between 1 to 500 characters long.',
      );
    }

    return new Comment(
      params.id,
      params.content,
      params.parking,
      params.author,
      params.createdAt,
      params.updatedAt,
    );
  }

  edit(newContent: string): Comment {
    if (newContent.length < 1 || newContent.length > 500) {
      throw new InvalidCommentContentLengthException(
        'Comment content length must be between 1 to 500 characters long.',
      );
    }

    return new Comment(
      this.id,
      newContent,
      this.parking,
      this.author,
      this.createdAt,
      new Date(),
    );
  }
}
