import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentFieldDto } from './create-document-field.dto';

export class UpdateDocumentFieldDto extends PartialType(
  CreateDocumentFieldDto,
) {}
