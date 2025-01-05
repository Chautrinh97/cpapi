import { Injectable } from '@nestjs/common';
import { DataSource, ILike, Repository } from 'typeorm';
import { Document, SyncStatus } from './schemas/document.schema';
import { DocumentPaginationQueryDto } from './dto/document-pagination-query.dto';
import { DocumentStatisticQueryDto } from './dto/document-statistic-query.dto';

@Injectable()
export class DocumentRepository extends Repository<Document> {
  constructor(private dataSource: DataSource) {
    super(Document, dataSource.createEntityManager());
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
      whereConditions.push({ syncStatus: SyncStatus.FAILED_RESYNC });
    }

    if (isSync !== undefined && isSync === false) {
      whereConditions.push({ syncStatus: SyncStatus.NOT_SYNC });
      whereConditions.push({ syncStatus: SyncStatus.PENDING_SYNC });
    }

    if (createdBy !== undefined && createdBy === true) {
      whereConditions.push({ user: { id: user.id } });
    }

    const [field, order] = orderBy.split(' ');

    const skip = (pageNumber - 1) * pageLimit;
    const take = isExport ? undefined : pageLimit;

    /* const [documents, total] = await this.findAndCount({
      where: whereConditions,
      relations: ['documentType', 'documentField', 'issuingBody', 'user'],
      order: { [field]: order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC' },
      skip,
      take,
    }); */

    const [documents, total] = await this.createQueryBuilder('document')
      .leftJoinAndSelect('document.documentType', 'documentType')
      .leftJoinAndSelect('document.documentField', 'documentField')
      .leftJoinAndSelect('document.issuingBody', 'issuingBody')
      .leftJoin('document.user', 'user')
      .addSelect(['user.id', 'user.fullName'])
      .where(whereConditions)
      .orderBy(
        `document.${field}`,
        order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      )
      .skip(skip)
      .take(take)
      .getManyAndCount();

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
