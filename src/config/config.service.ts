import { S3Client } from '@aws-sdk/client-s3';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import path, { join } from 'path';
import * as multerS3 from 'multer-s3';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get mailConfig() {
    return {
      transport: {
        host: this.configService.get<string>('MAIL_HOST'),
        secure: false,
        auth: {
          user: this.configService.get<string>('MAIL_USER'),
          pass: this.configService.get<string>('MAIL_PASSWORD'),
        },
      },
      defaults: {
        from: `Chatbot <${this.configService.get<string>('MAIL_FROM')}>`,
      },
      template: {
        dir: join(__dirname, '../../src/templates/email'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    };
  }

  get throttleConfig() {
    return [
      {
        ttl: 30000,
        limit: 60,
      },
    ];
  }

  get bullConfig() {
    return {
      connection: {
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT'),
      },
    };
  }

  get dbConfig(): TypeOrmModuleOptions {
    return {
      type: 'mysql',
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      username: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_SCHEMA'),
      autoLoadEntities: true,
      synchronize: true,
    };
  }

  private getS3Client() {
    return new S3Client({
      endpoint: this.configService.get<string>('DO_SPACE_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('DO_SPACE_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('DO_SPACE_SECRET_KEY'),
      },
    });
  }

  get documentDOSpaceConfig() {
    return {
      storage: multerS3({
        s3: this.getS3Client(),
        acl: 'public-read',
        key: (req, file, callback) => {
          const fileExt = path.extname(file.originalname);
          const newFileName = `${this.configService.get<string>('DO_SPACE_UPLOAD_PATH')}/${Date.now()}-${file.originalname.replace(fileExt, '')}${fileExt}`;
          callback(null, newFileName);
        },
        bucket: this.configService.get<string>('DO_SPACE_BUCKET'),
      }),
      limits: {
        fileSize: this.configService.get<number>('MAX_FILE_SIZE') * 1024 * 1024,
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Only .pdf and .doc/.docx files are allowed',
            ),
            false,
          );
        }
        callback(null, true);
      },
    };
  }

  get documentConfig() {
    return {
      storage: diskStorage({
        destination: this.configService.get<string>('UPLOAD_DESTINATION'),
        filename: (req, file, callback) => {
          const fileExt = path.extname(file.originalname);
          const newFileName = `${Date.now()}-${file.originalname.replace(fileExt, '')}${fileExt}`;
          callback(null, newFileName);
        },
      }),
      limits: {
        fileSize: this.configService.get<number>('MAX_FILE_SIZE') * 1024 * 1024,
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Only .pdf and .doc/.docx files are allowed',
            ),
            false,
          );
        }
        callback(null, true);
      },
    };
  }
}
