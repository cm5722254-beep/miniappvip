import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: AWS.S3;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly signedUrlSecret: string;
  private readonly signedUrlExpires: number;

  constructor(private readonly configService: ConfigService) {
    this.bucket = configService.get<string>('STORAGE_BUCKET', '');
    this.publicUrl = configService.get<string>('STORAGE_PUBLIC_URL', '');
    this.signedUrlSecret = configService.get<string>('SIGNED_URL_SECRET', '');
    this.signedUrlExpires = configService.get<number>('SIGNED_URL_EXPIRES_SECONDS', 3600);

    this.s3 = new AWS.S3({
      endpoint: configService.get<string>('STORAGE_ENDPOINT'),
      accessKeyId: configService.get<string>('STORAGE_ACCESS_KEY'),
      secretAccessKey: configService.get<string>('STORAGE_SECRET_KEY'),
      region: configService.get<string>('STORAGE_REGION', 'auto'),
      signatureVersion: 'v4',
      s3ForcePathStyle: false,
    });
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
    isPublic = false,
  ): Promise<string> {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ...(isPublic && { ACL: 'public-read' }),
    };

    await this.s3.upload(params).promise();
    return key;
  }

  /**
   * Generate a presigned S3 URL (expires after `expiresIn` seconds)
   * This is the ONLY way video URLs are returned — never raw permanent URLs
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const expires = expiresIn ?? this.signedUrlExpires;

    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: expires,
    };

    return this.s3.getSignedUrlPromise('getObject', params);
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<void> {
    await this.s3
      .deleteObject({ Bucket: this.bucket, Key: key })
      .promise();
  }

  /**
   * Generate a short-lived JWT playback token for additional authorization layer
   */
  generatePlaybackToken(episodeId: string, userId: string, expiresInSeconds = 3600): string {
    if (!this.signedUrlSecret) {
      throw new Error('SIGNED_URL_SECRET not configured');
    }
    return jwt.sign(
      { episodeId, userId, type: 'playback' },
      this.signedUrlSecret,
      { expiresIn: expiresInSeconds },
    );
  }

  /**
   * Verify playback token
   */
  verifyPlaybackToken(token: string): { episodeId: string; userId: string } {
    try {
      const payload = jwt.verify(token, this.signedUrlSecret) as {
        episodeId: string;
        userId: string;
        type: string;
      };
      if (payload.type !== 'playback') {
        throw new Error('Invalid token type');
      }
      return { episodeId: payload.episodeId, userId: payload.userId };
    } catch {
      throw new Error('Invalid or expired playback token');
    }
  }

  /**
   * Generate storage key for videos
   */
  generateVideoKey(movieId: string, episodeId: string, quality: string, extension = 'mp4'): string {
    return `videos/${movieId}/${episodeId}/${quality}.${extension}`;
  }

  /**
   * Generate storage key for posters/images
   */
  generateImageKey(type: 'poster' | 'banner' | 'thumbnail' | 'category', id: string, filename: string): string {
    const ext = filename.split('.').pop() || 'jpg';
    const unique = crypto.randomBytes(8).toString('hex');
    return `images/${type}/${id}/${unique}.${ext}`;
  }

  /**
   * Generate storage key for subtitles
   */
  generateSubtitleKey(episodeId: string, language: string): string {
    return `subtitles/${episodeId}/${language}.vtt`;
  }
}
