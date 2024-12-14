import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { DocumentFieldRepository } from './document-field.repository';
import { CreateDocumentFieldDto } from './dto/create-document-field.dto';
import { UpdateDocumentFieldDto } from './dto/update-document-field.dto';

@Injectable()
export class DocumentFieldService {
  constructor(
    private readonly documentFieldRepository: DocumentFieldRepository,
  ) {}

  async getDocumentFieldStatistic() {
    return await this.documentFieldRepository.getStatistic();
  }

  async getAllDocumentFields(query: PaginationQueryDto) {
    return await this.documentFieldRepository.getAll(query);
  }

  async getDocumentFieldById(id: number) {
    return await this.documentFieldRepository.findOneBy({ id: id });
  }

  async createDocumentField(dto: CreateDocumentFieldDto) {
    const existedDocumentField = await this.documentFieldRepository.findOneBy({
      name: dto.name,
    });
    if (existedDocumentField)
      throw new ConflictException('Exist document field');
    return await this.documentFieldRepository.save(dto);
  }

  async updateDocumentField(id: number, dto: UpdateDocumentFieldDto) {
    const existedDocumentField = await this.documentFieldRepository.findOneBy({
      id: id,
    });
    if (!existedDocumentField)
      throw new NotFoundException('Document field is not found');

    const existedDocumentFieldWithName =
      await this.documentFieldRepository.findOneBy({
        name: dto.name,
      });
    if (existedDocumentFieldWithName) {
      if (existedDocumentField.id !== existedDocumentField.id)
        throw new ConflictException('Exist document field');
    }
    return await this.documentFieldRepository.update({ id: id }, dto);
  }

  async deleteDocumentField(id: number) {
    const existedDocumentField = await this.documentFieldRepository.findOneBy({
      id: id,
    });
    if (!existedDocumentField)
      throw new NotFoundException('Document field is not found');
    return await this.documentFieldRepository.remove(existedDocumentField);
  }
}
