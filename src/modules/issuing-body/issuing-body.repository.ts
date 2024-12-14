import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { Repository, DataSource, ILike } from 'typeorm';
import { IssuingBody } from './schemas/issuing-body.schema';

@Injectable()
export class IssuingBodyRepository extends Repository<IssuingBody> {
  constructor(private dataSource: DataSource) {
    super(IssuingBody, dataSource.createEntityManager());
  }

  async getStatistic(): Promise<{ issuingBody: string; count: number }[]> {
    return await this.createQueryBuilder('issuingBody')
      .leftJoin('issuingBody.documents', 'document')
      .select('issuingBody.name', 'issuingBody')
      .addSelect('COALESCE(COUNT(document.id), 0)', 'count')
      .groupBy('issuingBody.name')
      .getRawMany();
  }

  async getAll(query: PaginationQueryDto) {
    const { searchKey, pageNumber, pageLimit, isExport, orderBy } = query;
    const whereConditions = searchKey
      ? [
          { name: ILike(`%${searchKey}%`) },
          { description: ILike(`%${searchKey}%`) },
        ]
      : undefined;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [field, order] = orderBy.split(' ');

    const skip = (pageNumber - 1) * pageLimit;
    const take = isExport ? undefined : pageLimit;

    const [issuingBodies, total] = await this.findAndCount({
      where: whereConditions,
      order: { name: order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC' },
      skip,
      take,
    });

    return {
      data: issuingBodies,
      total,
      currentPage: pageNumber,
      numberOfPages: Math.ceil(total / pageLimit),
    };
  }
}
