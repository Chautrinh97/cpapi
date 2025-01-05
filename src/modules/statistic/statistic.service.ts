import { Injectable } from '@nestjs/common';
import { DocumentService } from '../document/document.service';
import { DocumentTypeService } from '../document-type/document-type.service';
import { DocumentFieldService } from '../document-field/document-field.service';
import { IssuingBodyService } from '../issuing-body/issuing-body.service';
import { DocumentStatisticQueryDto } from '../document/dto/document-statistic-query.dto';

@Injectable()
export class StatisticService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly documentTypeService: DocumentTypeService,
    private readonly documentFieldService: DocumentFieldService,
    private readonly issuingBodyService: IssuingBodyService,
  ) {}

  private STATISTIC_THRESHOLD = 5;

  async getStatistic(query: DocumentStatisticQueryDto) {
    const documentTypes =
      await this.documentTypeService.getDocumentTypeStatistic(query);
    const documentFields =
      await this.documentFieldService.getDocumentFieldStatistic(query);
    const issuingBodies =
      await this.issuingBodyService.getIssuingBodyStatistic(query);

    const totalDocumentTypes = documentTypes.length;
    const totalDocumentFields = documentFields.length;
    const totalIssuingBodies = issuingBodies.length;

    const {
      totalDocuments,
      totalRegulatory,
      totalValid,
      totalSync,
      uncategorizedByType,
      uncategorizedByField,
      uncategorizedByBody,
    } = await this.documentService.getDocumentStatistic(query);

    if (uncategorizedByType > 0)
      documentTypes.push({
        documentType: 'Chưa chọn loại',
        count: uncategorizedByType,
      });
    if (uncategorizedByField > 0)
      documentFields.push({
        documentField: 'Chưa chọn lĩnh vực',
        count: uncategorizedByField,
      });
    if (uncategorizedByBody > 0)
      issuingBodies.push({
        issuingBody: 'Chưa chọn cơ quan',
        count: uncategorizedByBody,
      });

    documentTypes.sort((a, b) => a.count - b.count);
    documentFields.sort((a, b) => a.count - b.count);
    issuingBodies.sort((a, b) => a.count - b.count);

    const thresholdValue = Math.floor(
      (this.STATISTIC_THRESHOLD / 100) * totalDocuments,
    );

    const groupDocumentTypes = this.groupData(
      thresholdValue,
      documentTypes,
      'documentType',
    ).sort((a, b) => b.count - a.count);
    const groupDocumentFields = this.groupData(
      thresholdValue,
      documentFields,
      'documentField',
    ).sort((a, b) => b.count - a.count);
    const groupIssuingBodies = this.groupData(
      thresholdValue,
      issuingBodies,
      'issuingBody',
    ).sort((a, b) => b.count - a.count);

    return {
      data: {
        totalDocuments,
        totalDocumentFields,
        totalDocumentTypes,
        totalIssuingBodies,
        totalRegulatory,
        totalValid,
        totalSync,
        documentTypes: groupDocumentTypes,
        documentFields: groupDocumentFields,
        issuingBodies: groupIssuingBodies,
      },
    };
  }

  private groupData(thresholdValue: number, data: any[], title: string) {
    let accumulatedCount = 0;
    const result = [];
    let othersCount = 0;

    for (const item of data) {
      accumulatedCount += Number(item.count);

      if (accumulatedCount > thresholdValue) {
        result.push(item);
      } else {
        othersCount += item.count;
      }
    }

    if (othersCount > 0) {
      result.push({ [title]: 'Khác', count: othersCount });
    }

    return result;
  }
}
