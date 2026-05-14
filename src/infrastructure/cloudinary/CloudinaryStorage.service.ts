import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { StorageService } from '../../application/gateway/Storage.service';
import { ParkingPhoto } from '../../application/types/parking.types';

@Injectable()
export class CloudinaryStorageService implements StorageService {
  constructor(readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.get<string>('cloudinary.cloudName'),
      api_key: configService.get<string>('cloudinary.apiKey'),
      api_secret: configService.get<string>('cloudinary.apiSecret'),
    });
  }

  async uploadMany(
    files: ReadonlyArray<ParkingPhoto>,
  ): Promise<ReadonlyArray<string>> {
    const uploadedUrls: string[] = [];

    try {
      const results = await Promise.all(
        files.map((file) => this.uploadOne(file)),
      );
      uploadedUrls.push(...results);
      return uploadedUrls;
    } catch (error) {
      await Promise.allSettled(uploadedUrls.map((url) => this.deleteOne(url)));
      throw error;
    }
  }

  async deleteMany(photoUrls: ReadonlyArray<string>): Promise<void> {
    await Promise.allSettled(photoUrls.map((url) => this.deleteOne(url)));
  }

  private uploadOne(file: ParkingPhoto): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'parkings',
          transformation: [
            { width: 1200, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(
              error instanceof Error ? error : new Error('Upload failed'),
            );
          }
          resolve(result.secure_url);
        },
      );

      stream.end(file.buffer);
    });
  }

  private async deleteOne(url: string): Promise<void> {
    const publicId = this.extractPublicId(url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  }

  private extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z]+$/);
    return match ? match[1] : null;
  }
}
