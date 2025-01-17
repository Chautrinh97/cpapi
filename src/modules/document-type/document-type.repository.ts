import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { Repository, DataSource, ILike } from 'typeorm';
import { DocumentType } from './schemas/document-type.schema';
import { DocumentStatisticQueryDto } from '../document/dto/document-statistic-query.dto';
import { SyncStatus } from '../document/schemas/document.schema';

@Injectable()
export class DocumentTypeRepository extends Repository<DocumentType> {
  constructor(private dataSource: DataSource) {
    super(DocumentType, dataSource.createEntityManager());
  }

  async getStatistic(
    query: DocumentStatisticQueryDto,
  ): Promise<{ documentType: string; count: number }[]> {
    return await this.createQueryBuilder('documentType')
      .leftJoin(
        'documentType.documents',
        'document',
        `
      (document.isRegulatory = :isRegulatory OR :isRegulatory IS NULL)
      AND (document.validityStatus = :validityStatus OR :validityStatus IS NULL)
      AND (
        (:syncStatus IS NULL) OR
        (:syncStatus = true AND document.syncStatus IN (:...syncStatusesTrue)) OR
        (:syncStatus = false AND document.syncStatus IN (:...syncStatusesFalse))
      )
      `,
        {
          isRegulatory: query.isRegulatory ?? null,
          validityStatus: query.validityStatus ?? null,
          syncStatus: query.syncStatus ?? null,
          syncStatusesTrue: [SyncStatus.SYNC, SyncStatus.FAILED_RESYNC],
          syncStatusesFalse: [SyncStatus.PENDING_SYNC, SyncStatus.NOT_SYNC],
        },
      )
      .select('documentType.name', 'documentType')
      .addSelect('COALESCE(COUNT(document.id), 0)', 'count')
      .groupBy('documentType.name')
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

    const [documentTypes, total] = await this.findAndCount({
      where: whereConditions,
      order: { name: order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC' },
      skip,
      take,
    });

    return {
      data: documentTypes,
      total,
      currentPage: pageNumber,
      numberOfPages: Math.ceil(total / pageLimit),
    };
  }
}
