import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateIssuingBodyDto } from './dto/create-issuing-body.dto';
import { UpdateIssuingBodyDto } from './dto/update-issuing-body.dto';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { IssuingBodyRepository } from './issuing-body.repository';

@Injectable()
export class IssuingBodyService {
  constructor(private readonly issuingBodyRepository: IssuingBodyRepository) {}

  async getAllIssuingBodies(query: PaginationQueryDto) {
    return await this.issuingBodyRepository.getAll(query);
  }

  async getIssuingBodyStatistic() {
    return await this.issuingBodyRepository.getStatistic();
  }

  async getIssuingBodyById(id: number) {
    return await this.issuingBodyRepository.findOneBy({ id: id });
  }

  async createIssuingBody(dto: CreateIssuingBodyDto) {
    const existedIssuingBodyWithName =
      await this.issuingBodyRepository.findOneBy({ name: dto.name });
    if (existedIssuingBodyWithName)
      throw new ConflictException('Exist issuing body');
    return await this.issuingBodyRepository.save(dto);
  }

  async updateIssuingBody(id: number, dto: UpdateIssuingBodyDto) {
    const existedIssuingBody = await this.issuingBodyRepository.findOneBy({
      id: id,
    });
    if (!existedIssuingBody)
      throw new NotFoundException('Issuing body is not found');

    const existedIssuingBodyWithName =
      await this.issuingBodyRepository.findOneBy({ name: dto.name });
    if (existedIssuingBodyWithName) {
      if (existedIssuingBodyWithName.id !== existedIssuingBody.id)
        throw new ConflictException('Exist issuing body');
    }
    return await this.issuingBodyRepository.update({ id: id }, dto);
  }

  async deleteIssuingBody(id: number) {
    const existedIssuingBody = await this.issuingBodyRepository.findOneBy({
      id: id,
    });
    if (!existedIssuingBody)
      throw new NotFoundException('Issuing body is not found');
    return await this.issuingBodyRepository.remove(existedIssuingBody);
  }
}
