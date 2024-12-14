import { Module } from '@nestjs/common';
import { DocumentFieldController } from './document-field.controller';
import { DocumentFieldService } from './document-field.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentField } from './schemas/document-field.schema';
import { DocumentFieldRepository } from './document-field.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentField]), UserModule],
  controllers: [DocumentFieldController],
  providers: [DocumentFieldService, DocumentFieldRepository],
  exports: [DocumentFieldService],
})
export class DocumentFieldModule {}
