import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentRepository } from './document.repository';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentPaginationQueryDto } from './dto/document-pagination-query.dto';
import { DocumentTypeService } from '../document-type/document-type.service';
import { DocumentFieldService } from '../document-field/document-field.service';
import { IssuingBodyService } from '../issuing-body/issuing-body.service';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import { DocumentStatisticQueryDto } from './dto/document-statistic-query.dto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { SyncStatus } from './schemas/document.schema';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class DocumentService {
  private s3Client: S3Client;
  private MAX_FILE_SIZE_PDF: number;
  private MAX_FILE_SIZE_WORD: number;
  private ALLOW_MIME_TYPE = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentTypeService: DocumentTypeService,
    private readonly documentFieldService: DocumentFieldService,
    private readonly issuingBodyService: IssuingBodyService,
    private readonly configService: ConfigService,
    @InjectQueue('document-process')
    private readonly documentConsumer: Queue,
  ) {
    this.s3Client = new S3Client({
      endpoint: `https://${this.configService.get<string>('DO_SPACE_ENDPOINT')}`,
      region: this.configService.get<string>('DO_SPACE_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('DO_SPACE_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('DO_SPACE_SECRET_KEY'),
      },
    });
    this.MAX_FILE_SIZE_PDF =
      this.configService.get<number>('MAX_FILE_SIZE_PDF');
    this.MAX_FILE_SIZE_WORD =
      this.configService.get<number>('MAX_FILE_SIZE_WORD');
  }

  async downloadDocument(id: number) {
    const file = await this.documentRepository.findOne({
      where: { id: id },
    });
    if (!file) {
      throw new NotFoundException('Document not found');
    }

    // const fileName = filePath
    //   .split('/')
    //   .pop()
    //   ?.split('.')
    //   .slice(0, -1)
    //   .join('.')
    //   .replace(/^\d+-/, '');
    // let mimeType = 'application/msword';
    // if (filePath.endsWith('.pdf')) {
    //   mimeType = 'application/pdf';
    // } else if (filePath.endsWith('.docx'))
    //   mimeType =
    //     'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // const item = await this.s3Client.send(command);

    // res.header('Access-Control-Expose-Headers', 'Content-Disposition');
    // res.set({
    //   'Content-Type': mimeType,
    //   'Content-Disposition': `attachment; filename=${fileName}`,
    // });

    const command = new GetObjectCommand({
      Bucket: this.configService.get<string>('DO_SPACE_BUCKET'),
      Key: file.key,
    });
    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 60,
    });
    return { url: presignedUrl };
  }

  async uploadDocument(file: Express.Multer.File) {
    this.validateFile(file);
    const fileExt = path.extname(file.originalname);
    const key = `${this.configService.get<string>('DO_SPACE_UPLOAD_PATH')}/${Date.now()}-${file.originalname.replace(fileExt, '')}${fileExt}`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.configService.get<string>('DO_SPACE_BUCKET'),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
        ContentLength: file.size,
      }),
    );

    return `${key}`;
  }

  async unloadDocument(key: string) {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.configService.get<string>('DO_SPACE_BUCKET'),
        Key: key,
      }),
    );
  }

  async getDocumentStatistic(query: DocumentStatisticQueryDto) {
    const count = await this.documentRepository.count();

    const uncategorizedByType =
      await this.documentRepository.countUncategorizedByDocumentType(query);
    const uncategorizedByField =
      await this.documentRepository.countUncategorizedByDocumentField(query);
    const uncategorizedByBody =
      await this.documentRepository.countUncategorizedByIssuingBody(query);

    const totalValid = await this.documentRepository.count({
      where: {
        validityStatus: true,
      },
    });

    const totalRegulatory = await this.documentRepository.count({
      where: {
        isRegulatory: true,
      },
    });

    return {
      totalDocuments: count,
      totalRegulatory,
      totalValid,
      uncategorizedByType,
      uncategorizedByField,
      uncategorizedByBody,
    };
  }

  async createDocument(user, dto: CreateDocumentDto) {
    if (dto.documentTypeId) {
      const existedDocumentType =
        await this.documentTypeService.getDocumentTypeById(dto.documentTypeId);
      if (!existedDocumentType) {
        throw new NotFoundException('Document type not found');
      }
    }

    if (dto.documentFieldId) {
      const existedDocumentField =
        await this.documentFieldService.getDocumentFieldById(
          dto.documentFieldId,
        );
      if (!existedDocumentField) {
        throw new NotFoundException('Document field not found');
      }
    }

    if (dto.issuingBodyId) {
      const existedIssuingBody =
        await this.issuingBodyService.getIssuingBodyById(dto.issuingBodyId);
      if (!existedIssuingBody) {
        throw new NotFoundException('Issuing body not found');
      }
    }
    const fileUrl = `https://${this.configService.get<string>('DO_SPACE_BUCKET')}.${this.configService.get<string>('DO_SPACE_ENDPOINT')}/${dto.key}`;
    const document = this.documentRepository.create({
      ...dto,
      fileUrl: fileUrl,
    });
    return await this.documentRepository.save(document);
  }

  async updateDocument(id: number, dto: UpdateDocumentDto) {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) throw new NotFoundException('NOT_FOUND_DOCUMENT');

    if (dto.documentTypeId) {
      const existedDocumentType =
        await this.documentTypeService.getDocumentTypeById(dto.documentTypeId);
      if (!existedDocumentType) {
        throw new NotFoundException('Document type not found');
      }
    }

    if (dto.documentFieldId) {
      const existedDocumentField =
        await this.documentFieldService.getDocumentFieldById(
          dto.documentFieldId,
        );
      if (!existedDocumentField) {
        throw new NotFoundException('Document field not found');
      }
    }

    if (dto.issuingBodyId) {
      const existedIssuingBody =
        await this.issuingBodyService.getIssuingBodyById(dto.issuingBodyId);
      if (!existedIssuingBody) {
        throw new NotFoundException('Issuing body not found');
      }
    }

    if (dto.isNewAttachFile) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.configService.get<string>('DO_SPACE_BUCKET'),
          Key: document.key,
        }),
      );
      if (document.syncStatus === SyncStatus.SYNC) {
        document.docIndexId = '';
        await this.documentConsumer.add('unsync-document', {
          id: id,
          docIndexId: document.docIndexId,
        });
      }
    }
    Object.assign(document, dto);
    if (dto.validityStatus && dto.validityStatus === true) {
      document.unvalidDate === null;
    }
    return await this.documentRepository.save(document);
  }

  async getAllDocument(query: DocumentPaginationQueryDto) {
    const documents = await this.documentRepository.getAll(query);
    return documents;
  }

  async getDocumentById(id: number) {
    const document = await this.documentRepository.findOne({
      where: { id: id },
      relations: ['documentType', 'documentField', 'issuingBody'],
    });
    return document;
  }

  async deleteDocument(id: number) {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document)
      throw new NotFoundException(`Document with id ${id} not found`);
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.configService.get<string>('DO_SPACE_BUCKET'),
        Key: document.key,
      }),
    );
    if (document.syncStatus === SyncStatus.SYNC) {
      await this.documentConsumer.add('unsync-document', {
        id: id,
        docIndexId: document.docIndexId,
      });
    }

    await this.documentRepository.remove(document);
  }

  private validateFile(file: Express.Multer.File) {
    if (!this.ALLOW_MIME_TYPE.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF and Word documents are allowed.',
      );
    }

    let maxFileSize;
    if (file.mimetype === 'application/pdf') {
      maxFileSize = this.MAX_FILE_SIZE_PDF * 1024 * 1024;
    } else {
      maxFileSize = this.MAX_FILE_SIZE_WORD * 1024;
    }
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File size exceeds the maximum limit of ${maxFileSize} byte.`,
      );
    }
  }

  async syncDocument(id: number) {
    console.log('Access block to sync document with id: ', id);
    const document = await this.documentRepository.findOne({
      where: { id: id },
    });
    if (!document) throw new NotFoundException('Document is not found');

    document.syncStatus = SyncStatus.PENDING_SYNC;
    const docId = uuidv4();
    document.docIndexId = docId;
    console.log('DOCUMENT PENDING SYNC: ', document.syncStatus);
    console.log('Document doc index id: ', docId);
    await this.documentRepository.save(document);

    await this.documentConsumer.add(
      'sync-document',
      {
        id: id,
        url: document.fileUrl,
        key: document.key,
        docId: docId,
      },
      {
        attempts: 1,
        backoff: {
          type: 'exponential',
          delay: 15000,
        },
      },
    );

    await this.documentConsumer.add(
      'check-sync-status',
      { id: id },
      {
        delay: 600000,
      },
    );

    return { message: 'Please wait to syn document' };
  }

  async unsyncDocument(id: number) {
    const document = await this.documentRepository.findOne({
      where: { id: id },
    });
    if (!document) throw new NotFoundException('');

    document.syncStatus = SyncStatus.NOT_SYNC;

    await this.documentConsumer.add('unsync-document', {
      id: id,
      docIndexId: document.docIndexId,
    });

    return { message: 'Please wait to unsync document.' };
  }

  async updateDocumentSyncStatus(id: number, syncStatus: SyncStatus) {
    console.log('Access block to update sync status with id: ', id);
    const document = await this.documentRepository.findOne({
      where: { id: id },
    });
    if (!document) throw new NotFoundException('Not found document');
    document.syncStatus = syncStatus;
    console.log(
      'Already update sync status document with status: ',
      document.syncStatus,
    );
    if (syncStatus === SyncStatus.NOT_SYNC) {
      document.docIndexId = '';
    }
    await this.documentRepository.save(document);
  }
}
