import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} from '../constants/pipes.constants';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(files: Array<Express.Multer.File>) {
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid image type. Only jpg, png, webp allowed.',
        );
      }

      if (file.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException('File too large. Max 3MB per file');
      }
    }

    return files;
  }
}
