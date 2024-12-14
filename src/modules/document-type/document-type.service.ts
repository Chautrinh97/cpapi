import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { DocumentTypeRepository } from './document-type.repository';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

@Injectable()
export class DocumentTypeService {
  constructor(
    private readonly documentTypeRepository: DocumentTypeRepository,
  ) {}

  async getDocumentTypeStatistic() {
    return await this.documentTypeRepository.getStatistic();
  }

  async getAllDocumentTypes(query: PaginationQueryDto) {
    return await this.documentTypeRepository.getAll(query);
  }

  async getDocumentTypeById(id: number) {
    return await this.documentTypeRepository.findOneBy({
      id: id,
    });
  }

  async createDocumentType(dto: CreateDocumentTypeDto) {
    const existedDocumentTypeWithName =
      await this.documentTypeRepository.findOneBy({ name: dto.name });
    if (existedDocumentTypeWithName)
      throw new ConflictException('Exist document type name');
    return await this.documentTypeRepository.save(dto);
  }

  async updateDocumentType(id: number, dto: UpdateDocumentTypeDto) {
    const existedDocumentType = await this.documentTypeRepository.findOneBy({
      id: id,
    });
    if (!existedDocumentType)
      throw new NotFoundException('Document type is not found');

    const existedDocumentTypeWithName =
      await this.documentTypeRepository.findOneBy({ name: dto.name });
    if (existedDocumentTypeWithName) {
      if (existedDocumentTypeWithName.id !== existedDocumentType.id)
        throw new ConflictException('Exist document type name');
    }
    return await this.documentTypeRepository.update({ id: id }, dto);
  }

  async deleteDocumentType(id: number) {
    const existedDocumentType = await this.documentTypeRepository.findOneBy({
      id: id,
    });
    if (!existedDocumentType)
      throw new NotFoundException('Document type is not found');
    return await this.documentTypeRepository.remove(existedDocumentType);
  }
}
