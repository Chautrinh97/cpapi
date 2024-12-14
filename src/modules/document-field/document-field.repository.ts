import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { Repository, DataSource, ILike } from 'typeorm';
import { DocumentField } from './schemas/document-field.schema';

@Injectable()
export class DocumentFieldRepository extends Repository<DocumentField> {
  constructor(private dataSource: DataSource) {
    super(DocumentField, dataSource.createEntityManager());
  }

  async getStatistic(): Promise<{ documentField: string; count: number }[]> {
    return await this.createQueryBuilder('documentField')
      .leftJoin('documentField.documents', 'document')
      .select('documentField.name', 'documentField')
      .addSelect('COALESCE(COUNT(document.id), 0)', 'count')
      .groupBy('documentField.name')
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

    const [documentFields, total] = await this.findAndCount({
      where: whereConditions,
      order: { name: order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC' },
      skip,
      take,
    });

    return {
      data: documentFields,
      total,
      currentPage: pageNumber,
      numberOfPages: Math.ceil(total / pageLimit),
    };
  }
}
