import { Injectable } from '@nestjs/common';
import { DataSource, ILike, Not, Repository } from 'typeorm';
import { Document, SyncStatus } from './schemas/document.schema';
import { DocumentPaginationQueryDto } from './dto/document-pagination-query.dto';
import { DocumentStatisticQueryDto } from './dto/document-statistic-query.dto';

@Injectable()
export class DocumentRepository extends Repository<Document> {
  constructor(private dataSource: DataSource) {
    super(Document, dataSource.createEntityManager());
  }

  async getAll(query: DocumentPaginationQueryDto) {
    const {
      documentField,
      documentType,
      issuingBody,
      isRegulatory,
      isValid,
      isSync,
      searchKey,
      pageNumber,
      pageLimit,
      isExport,
      orderBy,
    } = query;

    const whereConditions: any = [];
    if (searchKey) {
      whereConditions.push(
        { title: ILike(`%${searchKey}%`) },
        { description: ILike(`%${searchKey}%`) },
        { referenceNumber: ILike(`%${searchKey}%`) },
      );
    }

    if (documentType) {
      whereConditions.push({ documentType: { id: documentType } });
    }

    if (documentField) {
      whereConditions.push({ documentField: { id: documentField } });
    }

    if (issuingBody) {
      whereConditions.push({ issuingBody: { id: issuingBody } });
    }

    if (isRegulatory !== undefined) {
      whereConditions.push({ isRegulatory });
    }

    if (isValid !== undefined) {
      whereConditions.push({ validityStatus: isValid });
    }

    if (isSync !== undefined && isSync === true) {
      whereConditions.push({ syncStatus: SyncStatus.SYNC });
    }

    if (isSync !== undefined && isSync === false) {
      whereConditions.push({ syncStatus: Not(SyncStatus.SYNC) });
    }

    const [field, order] = orderBy.split(' ');

    const skip = (pageNumber - 1) * pageLimit;
    const take = isExport ? undefined : pageLimit;

    const [documents, total] = await this.findAndCount({
      where: whereConditions,
      relations: ['documentType', 'documentField', 'issuingBody'],
      order: { [field]: order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC' },
      skip,
      take,
    });

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
