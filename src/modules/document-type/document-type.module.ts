import { Module } from '@nestjs/common';
import { DocumentTypeService } from './document-type.service';
import { DocumentTypeController } from './document-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentType } from './schemas/document-type.schema';
import { DocumentTypeRepository } from './document-type.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentType]), UserModule],
  providers: [DocumentTypeService, DocumentTypeRepository],
  controllers: [DocumentTypeController],
  exports: [DocumentTypeService],
})
export class DocumentTypeModule {}
