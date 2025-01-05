// import path from 'path';
// import * as fs from 'fs';
// import { Document, LlamaParseReader } from 'llamaindex';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import axios from 'axios';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { DocumentRepository } from '../document.repository';
import { HttpStatus, OnModuleInit } from '@nestjs/common';
import { SyncStatus, Document } from '../schemas/document.schema';
import { DocumentService } from '../document.service';
@Processor('document-process', { concurrency: 2 })
export class DocumentProcessConsumer
  extends WorkerHost
  implements OnModuleInit
{
  constructor(
    private readonly configService: ConfigService,
    private readonly documentRepository: DocumentRepository,
    private readonly documentService: DocumentService,
  ) {
    super();
  }
  onModuleInit() {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    switch (job.name) {
      case 'sync-document':
        await this.syncDocument(job.data);
        break;
      case 'resync-document':
        await this.resyncDocument(job.data);
        break;
      case 'remove-resync-document':
        await this.removeAndResyncDocument(job.data);
        break;
    }
  }

  private async syncDocument(data) {
    /*const { id, url, key, docId } = data;
    let parsedDocument: Document;
    try {
      const filePath = await this.downloadFile(url, key);
      const parser = new LlamaParseReader({
        apiKey: this.configService.get<string>('LLAMA_CLOUD_API_KEY_1'),
        resultType: 'markdown',
        splitByPage: false,
        language: 'vi',
      });
      parsedDocument = (await parser.loadData(filePath))[0];
      await this.deleteFile(filePath);
    } catch {
      const document = await this.documentRepository.findOne({
        where: { id: id },
      });
      document.syncStatus = SyncStatus.FAILED_SYNC;
      document.docIndexId = '';
      await this.documentRepository.save(document);
      return;
    }

    console.log(
      'parsed document below: \n ',
      parsedDocument.text.slice(0, 100),
      '\n',
    );
    try {
      await axios.post(
        `${this.configService.get<string>('CHATBOT_ENDPOINT')}/document/sync`,
        JSON.stringify({
          id: id,
          doc_id: docId,
          text: parsedDocument.text,
          storage_path: url,
          key: key,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      console.log('CHATBOT ENDPOINT NOT RESPONSE');
      const document = await this.documentRepository.findOne({
        where: { id: id },
      });
      document.syncStatus = SyncStatus.FAILED_SYNC;
      document.docIndexId = '';
      await this.documentRepository.save(document);
    } */

    console.log('ACCESS SENDING SYNC REQUEST');

    const document = await this.documentRepository.findOne({
      where: { id: data.id },
      relations: ['issuingBody', 'documentType', 'documentField'],
    });

    try {
      const response = await axios.post(
        `${this.configService.get<string>('CHATBOT_ENDPOINT')}/document/sync`,
        JSON.stringify(this.getDocumentMetadata(document)),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === HttpStatus.OK) {
        console.log('SYNC DOCUMENT SUCCESSFULLY');
        const docIndexId = response.data.doc_id;
        document.syncStatus = SyncStatus.SYNC;
        document.docIndexId = docIndexId;
      } else {
        console.log('SYNC DOCUMENT FAILED');
        document.syncStatus = SyncStatus.NOT_SYNC;
      }
      document.isLocked = false;
      await this.documentRepository.save(document);
    } catch {
      console.log('PROBLEM IN POST REQUEST SYNC DOCUMENT -> FAILED');
      document.syncStatus = SyncStatus.NOT_SYNC;
      document.isLocked = false;
      await this.documentRepository.save(document);
    }
  }

  private async resyncDocument(data) {
    console.log('ACCESS SENDING RESYNC REQUEST');
    const document = await this.documentRepository.findOne({
      where: { id: data.id },
      relations: ['issuingBody', 'documentType', 'documentField'],
    });
    try {
      const documentMetadata = this.getDocumentMetadata(document);
      const requestData = { doc_id: document.docIndexId, ...documentMetadata };
      const response = await axios.post(
        `${this.configService.get<string>('CHATBOT_ENDPOINT')}/document/resync`,
        JSON.stringify(requestData),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === HttpStatus.OK) {
        console.log('RESYNC DOCUMENT SUCCESSFULLY');
        const docIndexId = response.data.doc_id;
        document.syncStatus = SyncStatus.SYNC;
        document.docIndexId = docIndexId;
      } else {
        console.log('RESYNC DOCUMENT FAILED');
        document.syncStatus = SyncStatus.FAILED_RESYNC;
      }
      document.isLocked = false;
      await this.documentRepository.save(document);
    } catch {
      console.log('PROBLEM IN POST REQUEST RESYNC DOCUMENT -> FAILED');
      document.syncStatus = SyncStatus.FAILED_RESYNC;
      document.isLocked = false;
      await this.documentRepository.save(document);
    }
  }

  private async removeAndResyncDocument(data) {
    const { id, oldKey } = data;
    //Lúc này document đã lưu key và file url mới.
    const document = await this.documentRepository.findOne({
      where: { id: id },
      relations: ['issuingBody', 'documentType', 'documentField'],
    });
    const documentMetadata = this.getDocumentMetadata(document);
    const requestData = {
      doc_id: document.docIndexId,
      old_key: oldKey,
      ...documentMetadata,
    };
    try {
      const response = await axios.post(
        `${this.configService.get<string>('CHATBOT_ENDPOINT')}/document/remove-and-resync`,
        JSON.stringify(requestData),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
      if (response.status === HttpStatus.OK) {
        //Cập nhật document với docIndexId mới
        document.docIndexId = response.data.doc_id;
        document.syncStatus = SyncStatus.SYNC;
        console.log('REMOVE AND SYNC DOCUMENT SUCCESFULLY');
      } else {
        console.log('REMOVE AND SYNC DOCUMENT FAILED');
        document.syncStatus = SyncStatus.FAILED_RESYNC;
      }
      document.isLocked = false;
      await this.documentRepository.save(document);
    } catch {
      console.log('PROBLEM IN REQUEST REMOVE AND SYNC DOCUMENT -> FAILED');
      document.syncStatus = SyncStatus.FAILED_RESYNC;
      document.isLocked = false;
      await this.documentRepository.save(document);
    }
  }

  private getDocumentMetadata(document: Document) {
    return {
      title: document.title,
      referenceNumber: document.referenceNumber || '',
      issuingBody: document.issuingBody?.name || '',
      documentType: document.documentType?.name || '',
      documentField: document.documentField?.name || '',
      issuanceDate: document.issuanceDate
        ? document.issuanceDate.toDateString()
        : '',
      effectiveDate: document.effectiveDate
        ? document.effectiveDate.toDateString()
        : '',
      isRegulatory: document.isRegulatory
        ? 'regulatory document'
        : 'non-regulatory document',
      validityStatus: document.validityStatus ? 'valid' : 'expired',
      invalidDate: document.invalidDate
        ? document.invalidDate.toDateString()
        : '',
      key: document.key,
      fileUrl: document.fileUrl,
    };
  }

  /* private async downloadFile(url: string, key: string) {
    try {
      const response = await axios.get(url, {
        responseType: 'stream',
      });
      const dir = path.resolve(__dirname, '../', key);
      const dirPath = path.dirname(dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const writer = fs.createWriteStream(dir);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      console.log(`File đã được tải về tại: ${dir}\n`);
      return dir;
    } catch {
      console.log('Error while downloading file');
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      fs.unlinkSync(filePath);
      console.log(`File đã được xóa \n`);
    } catch (error) {
      console.error(`Lỗi khi xóa file: ${error.message}`);
      throw new Error(`Không thể xóa file: ${filePath}`);
    }
  } */
}
