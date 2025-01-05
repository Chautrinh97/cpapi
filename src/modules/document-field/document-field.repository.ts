import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { Repository, DataSource, ILike } from 'typeorm';
import { DocumentField } from './schemas/document-field.schema';
import { DocumentStatisticQueryDto } from '../document/dto/document-statistic-query.dto';
import { SyncStatus } from '../document/schemas/document.schema';

@Injectable()
export class DocumentFieldRepository extends Repository<DocumentField> {
  constructor(private dataSource: DataSource) {
    super(DocumentField, dataSource.createEntityManager());
  }

  async getStatistic(
    query: DocumentStatisticQueryDto,
  ): Promise<{ documentField: string; count: number }[]> {
    return await this.createQueryBuilder('documentField')
      .leftJoin(
        'documentField.documents',
        'document',
        `
          (document.isRegulatory = :isRegulatory OR :isRegulatory IS NULL)
          AND (document.validityStatus = :validityStatus OR :validityStatus IS NULL)
          AND (document.syncStatus = :syncStatus OR :syncStatus IS NULL)
          `,
        {
          isRegulatory: query.isRegulatory ?? null,
          validityStatus: query.validityStatus ?? null,
          syncStatus: query.syncStatus ? SyncStatus.SYNC : null,
        },
      )
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
