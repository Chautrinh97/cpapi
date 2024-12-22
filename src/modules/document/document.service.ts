import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import axios from 'axios';
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

    /*const fileName = filePath
      .split('/')
      .pop()
      ?.split('.')
      .slice(0, -1)
      .join('.')
      .replace(/^\d+-/, '');
    let mimeType = 'application/msword';
    if (filePath.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (filePath.endsWith('.docx'))
      mimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const item = await this.s3Client.send(command);

    res.header('Access-Control-Expose-Headers', 'Content-Disposition');
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename=${fileName}`,
    }); */

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

    const totalSync = await this.documentRepository.count({
      where: {
        syncStatus: SyncStatus.SYNC,
      },
    });

    return {
      totalDocuments: count,
      totalRegulatory,
      totalValid,
      totalSync,
      uncategorizedByType,
      uncategorizedByField,
      uncategorizedByBody,
    };
  }

  async createDocument(dto: CreateDocumentDto) {
    if (dto.documentTypeId) {
      const existedDocumentType =
        await this.documentTypeService.getDocumentTypeById(dto.documentTypeId);
      if (!existedDocumentType) {
        await this.unloadDocument(dto.key);
        throw new NotFoundException('Document type not found');
      }
    }
    if (dto.documentFieldId) {
      const existedDocumentField =
        await this.documentFieldService.getDocumentFieldById(
          dto.documentFieldId,
        );
      if (!existedDocumentField) {
        await this.unloadDocument(dto.key);
        throw new NotFoundException('Document field not found');
      }
    }
    if (dto.issuingBodyId) {
      const existedIssuingBody =
        await this.issuingBodyService.getIssuingBodyById(dto.issuingBodyId);
      if (!existedIssuingBody) {
        await this.unloadDocument(dto.key);
        throw new NotFoundException('Issuing body not found');
      }
    }

    const fileUrl = `https://${this.configService.get<string>('DO_SPACE_BUCKET')}.${this.configService.get<string>('DO_SPACE_ENDPOINT')}/${dto.key}`;
    const document = this.documentRepository.create({
      ...dto,
      fileUrl: fileUrl,
    });
    if (dto.isSync) {
      console.log('ADD WITH SYNC');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      document.syncStatus = SyncStatus.PENDING_SYNC;
      document.isLocked = true;
      await this.documentRepository.save(document);
      await this.documentConsumer.add('sync-document', { id: document.id });
    } else {
      document.syncStatus = SyncStatus.NOT_SYNC;
      await this.documentRepository.save(document);
    }
  }

  async updateDocument(id: number, dto: UpdateDocumentDto) {
    console.log(dto);
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException('NOT_FOUND_DOCUMENT');
    }
    try {
      if (dto.documentTypeId) {
        const existedDocumentType =
          await this.documentTypeService.getDocumentTypeById(
            dto.documentTypeId,
          );
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
    } catch {
      if (dto.key) await this.unloadDocument(dto.key);
      throw new NotFoundException('Something not found');
    }

    if (document.isLocked) {
      if (dto.key) await this.unloadDocument(dto.key);
      throw new ConflictException('Some progress is running');
    }
    document.isLocked = true;
    await this.documentRepository.save(document);

    let newFileUrl;
    if (dto.key)
      newFileUrl = `https://${this.configService.get<string>('DO_SPACE_BUCKET')}.${this.configService.get<string>('DO_SPACE_ENDPOINT')}/${dto.key}`;
    console.log('new file url:', newFileUrl);
    console.log(dto.key);
    if (dto.validityStatus) {
      dto.invalidDate = null;
      if (
        document.syncStatus === SyncStatus.SYNC ||
        document.syncStatus === SyncStatus.FAILED_RESYNC
      ) {
        document.syncStatus = SyncStatus.PENDING_SYNC;
        if (dto.key) {
          /* 
            Trường hợp có file mới, đang đồng bộ, còn hiệu lực -> remove and sync
          */
          //unload hay xóa file cũ
          await this.unloadDocument(document.key);
          //Cập nhật document với file url mới
          document.fileUrl = newFileUrl;
        }
        /* 
          Trường hợp KHÔNG file mới, đang đồng bộ, còn hiệu lực -> resync
        */
        //Trong trường hợp có dto.key, key mới sẽ được gắn.
        Object.assign(document, dto);
        await this.documentRepository.save(document);
        //Thực hiện gọi resync document trong job queue
        await this.documentConsumer.add('resync-document', {
          id: document.id,
        });
        return { message: 'UPDATING_DOCUMENT' };
      } else {
        if (dto.key) {
          /*
          Trường hợp có file mới, đang KHÔNG đồng bộ, còn hiệu lực -> unload file cũ.
          */
          await this.unloadDocument(document.key);
          document.fileUrl = newFileUrl;
        }
        Object.assign(document, dto);
        document.isLocked = false;
        await this.documentRepository.save(document);
        return { message: 'UPDATE_SUCCESSFULLY' };
      }
    } else {
      if (
        document.syncStatus === SyncStatus.SYNC ||
        document.syncStatus === SyncStatus.FAILED_RESYNC
      ) {
        if (dto.key) {
          /*
          Trường hợp có file mới, đang đồng bộ, HẾT hiệu lực -> xóa file cũ, unsync
          */
          await this.unloadDocument(document.key);
          document.fileUrl = newFileUrl;
        }
        Object.assign(document, dto);
        document.syncStatus = SyncStatus.NOT_SYNC;
        document.isLocked = false;
        await this.documentRepository.save(document);
        await axios.post(
          `${this.configService.get<string>('CHATBOT_ENDPOINT')}/document/unsync`,
          JSON.stringify({ doc_id: document.docIndexId }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
        return { message: 'UPDATE_SUCCESSFULLY' };
      } else {
        if (dto.key) {
          /*
            Trường hợp có file mới, đang KHÔNG đồng bộ, HẾT hiệu lực -> chỉ cập nhật, không làm gì thêm
          */
          await this.unloadDocument(document.key);
          document.fileUrl = newFileUrl;
        }
        Object.assign(document, dto);
        document.isLocked = false;
        await this.documentRepository.save(document);
        return { message: 'UPDATE_SUCCESSFULLY' };
      }
    }
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
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async deleteDocument(id: number) {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document)
      throw new NotFoundException(`Document with id ${id} not found`);
    if (document.isLocked)
      throw new ConflictException('Some progress is running');
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.configService.get<string>('DO_SPACE_BUCKET'),
        Key: document.key,
      }),
    );
    if (
      document.syncStatus === SyncStatus.SYNC ||
      document.syncStatus === SyncStatus.FAILED_RESYNC
    ) {
      await axios.post(
        `${this.configService.get<string>('CHATBOT_ENDPOINT')}/document/unsync`,
        JSON.stringify({ doc_id: document.docIndexId }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
    await this.documentRepository.remove(document);
  }

  private validateFile(file: Express.Multer.File) {
    console.log('File size:', file.size);
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
    const document = await this.documentRepository.findOne({
      where: { id: id },
    });
    if (!document) throw new NotFoundException('Document is not found');
    if (!document.validityStatus)
      throw new ForbiddenException('INVALID_DOCUMENT');
    if (document.isLocked) throw new ConflictException('IN_PROGRESS_DOCUMENT');
    console.log('Access block to sync document with id: ', id);
    document.syncStatus = SyncStatus.PENDING_SYNC;
    document.isLocked = true;
    await this.documentRepository.save(document);

    await this.documentConsumer.add('sync-document', {
      id: id,
    });
    return { message: 'Please wait to synchronize document' };
  }

  async unsyncDocument(id: number) {
    const document = await this.documentRepository.findOne({
      where: { id: id },
    });
    if (!document) throw new NotFoundException('Not found document');
    if (document.isLocked)
      throw new ConflictException('Some progress is running');
    document.isLocked = true;
    document.syncStatus = SyncStatus.NOT_SYNC;
    await this.documentRepository.save(document);

    await this.documentConsumer.add('unsync-document', {
      id: id,
      docIndexId: document.docIndexId,
    });

    return { message: 'Please wait to unsync document.' };
  }

  /*   async updateDocumentSyncStatus(id: number, syncStatus: SyncStatus) {
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
  } */
}
