import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Document, SyncStatus } from './schemas/document.schema';
import { DocumentPaginationQueryDto } from './dto/document-pagination-query.dto';
import { DocumentStatisticQueryDto } from './dto/document-statistic-query.dto';

@Injectable()
export class DocumentRepository extends Repository<Document> {
  constructor(private dataSource: DataSource) {
    super(Document, dataSource.createEntityManager());
  }

  async getIssuanceDistinctYears() {
    const years = await this.createQueryBuilder('document')
      .select('DISTINCT YEAR(document.issuanceDate)', 'year')
      .orderBy('year', 'DESC')
      .getRawMany();
    return years.map((record) => record.year);
  }

  async getAll(user, query: DocumentPaginationQueryDto) {
    const {
      documentField,
      documentType,
      issuingBody,
      isRegulatory,
      isValid,
      isSync,
      createdBy,
      searchKey,
      pageNumber,
      pageLimit,
      isExport,
      orderBy,
      year,
    } = query;
    const qb = this.createQueryBuilder('document')
      .leftJoinAndSelect('document.documentType', 'documentType')
      .leftJoinAndSelect('document.documentField', 'documentField')
      .leftJoinAndSelect('document.issuingBody', 'issuingBody')
      .leftJoin('document.user', 'user')
      .addSelect(['user.id', 'user.fullName']);

    // Điều kiện tìm kiếm với searchKey
    if (searchKey) {
      qb.andWhere(
        `(LOWER(document.title) LIKE :searchKey OR LOWER(document.description) LIKE :searchKey OR LOWER(document.referenceNumber) LIKE :searchKey)`,
        { searchKey: `%${searchKey.toLowerCase()}%` },
      );
    }

    // Điều kiện lọc khác
    if (documentType) {
      qb.andWhere('document.documentType.id = :documentType', { documentType });
    }

    if (documentField) {
      qb.andWhere('document.documentField.id = :documentField', {
        documentField,
      });
    }

    if (issuingBody) {
      qb.andWhere('document.issuingBody.id = :issuingBody', { issuingBody });
    }

    if (isRegulatory !== undefined) {
      qb.andWhere('document.isRegulatory = :isRegulatory', { isRegulatory });
    }

    if (isValid !== undefined) {
      qb.andWhere('document.validityStatus = :isValid', { isValid });
    }

    if (isSync !== undefined) {
      if (isSync === true) {
        qb.andWhere(
          '(document.syncStatus = :sync OR document.syncStatus = :failedResync)',
          { sync: SyncStatus.SYNC, failedResync: SyncStatus.FAILED_RESYNC },
        );
      } else {
        qb.andWhere(
          '(document.syncStatus = :notSync OR document.syncStatus = :pendingSync)',
          {
            notSync: SyncStatus.NOT_SYNC,
            pendingSync: SyncStatus.PENDING_SYNC,
          },
        );
      }
    }

    if (createdBy !== undefined && createdBy === true) {
      qb.andWhere('document.user.id = :userId', { userId: user.id });
    }

    // Điều kiện lọc theo năm
    if (year) {
      qb.andWhere(`EXTRACT(YEAR FROM document.issuanceDate) = :year`, { year });
    }

    // Xử lý phân trang
    const [field, order] = orderBy.split(' ');
    const skip = (pageNumber - 1) * pageLimit;
    const take = isExport ? undefined : pageLimit;

    qb.orderBy(
      `document.${field}`,
      order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    )
      .skip(skip)
      .take(take);

    const [documents, total] = await qb.getManyAndCount();

    return {
      data: documents,
      total,
      currentPage: pageNumber,
      numberOfPages: Math.ceil(total / pageLimit),
    };
  }

  async countUncategorizedByDocumentType(query: DocumentStatisticQueryDto) {
    const { isRegulatory, validityStatus, syncStatus } = query;

    const qb = this.createQueryBuilder('document')
      .leftJoin('document.documentType', 'documentType')
      .where('documentType.id IS NULL');

    if (isRegulatory !== undefined) {
      qb.andWhere('document.isRegulatory = :isRegulatory', { isRegulatory });
    }

    if (validityStatus !== undefined) {
      qb.andWhere('document.validityStatus = :validityStatus', {
        validityStatus,
      });
    }

    if (syncStatus !== undefined) {
      qb.andWhere('document.syncStatus = :status', {
        status: SyncStatus.SYNC,
      });
    }

    return await qb.getCount();
  }

  async countUncategorizedByDocumentField(query: DocumentStatisticQueryDto) {
    const { isRegulatory, validityStatus, syncStatus } = query;

    const qb = this.createQueryBuilder('document')
      .leftJoin('document.documentField', 'documentField')
      .where('documentField.id IS NULL');

    if (isRegulatory !== undefined) {
      qb.andWhere('document.isRegulatory = :isRegulatory', { isRegulatory });
    }

    if (validityStatus !== undefined) {
      qb.andWhere('document.validityStatus = :validityStatus', {
        validityStatus,
      });
    }

    if (syncStatus !== undefined) {
      qb.andWhere('document.syncStatus = :status', {
        status: SyncStatus.SYNC,
      });
    }

    return await qb.getCount();
  }

  async countUncategorizedByIssuingBody(query: DocumentStatisticQueryDto) {
    const { isRegulatory, validityStatus, syncStatus } = query;

    const qb = this.createQueryBuilder('document')
      .leftJoin('document.issuingBody', 'issuingBody')
      .where('issuingBody.id IS NULL');

    if (isRegulatory !== undefined) {
      qb.andWhere('document.isRegulatory = :isRegulatory', { isRegulatory });
    }

    if (validityStatus !== undefined) {
      qb.andWhere('document.validityStatus = :validityStatus', {
        validityStatus,
      });
    }

    if (syncStatus !== undefined) {
      qb.andWhere('document.syncStatus = :status', {
        status: SyncStatus.SYNC,
      });
    }
    return await qb.getCount();
  }
}
