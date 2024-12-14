import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './schemas/document.schema';
// import { MulterModule } from '@nestjs/platform-express';
import { DocumentRepository } from './document.repository';
// import { AppConfigModule } from 'src/config/config.module';
// import { AppConfigService } from 'src/config/config.service';
import { UserModule } from '../user/user.module';
import { DocumentFieldModule } from '../document-field/document-field.module';
import { DocumentTypeModule } from '../document-type/document-type.module';
import { IssuingBodyModule } from '../issuing-body/issuing-body.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    // MulterModule.registerAsync({
    //   imports: [AppConfigModule],
    //   useFactory: (configService: AppConfigService) =>
    //     configService.documentDOSpaceConfig,
    //   inject: [AppConfigService],
    // }),
    UserModule,
    DocumentFieldModule,
    DocumentTypeModule,
    IssuingBodyModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentRepository],
  exports: [DocumentService],
})
export class DocumentModule {}
