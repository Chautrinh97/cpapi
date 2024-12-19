import { Processor, WorkerHost } from '@nestjs/bullmq';
import axios from 'axios';
import { Job } from 'bullmq';
import path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { Document, LlamaParseReader } from 'llamaindex';
import { DocumentRepository } from '../document.repository';
import { OnModuleInit } from '@nestjs/common';
import { SyncStatus } from '../schemas/document.schema';
@Processor('document-process', { concurrency: 2 })
export class DocumentProcessConsumer
  extends WorkerHost
  implements OnModuleInit
{
  private count;
  constructor(
    private readonly configService: ConfigService,
    private readonly documentRepository: DocumentRepository,
  ) {
    super();
  }
  onModuleInit() {
    this.count = 0;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    switch (job.name) {
      case 'sync-document':
        await this.syncDocument(job.data);
        break;
      case 'unsync-document':
        await this.unsyncDocument(job.data);
        break;
      case 'check-sync-status':
        await this.checkSyncStatus(job.data);
    }
  }

  private async syncDocument(data) {
    const { id, url, key, docId } = data;
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
    }
  }

  async unsyncDocument(data) {
    const { id, docIndexId } = data;
    try {
      await axios.post(
        `${this.configService.get<string>('CHATBOT_ENDPOINT')}/document/unsync`,
        JSON.stringify({
          doc_id: docIndexId,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    } catch {
      const document = await this.documentRepository.findOne({
        where: { id: id },
      });
      document.syncStatus = SyncStatus.SYNC;
      await this.documentRepository.save(document);
      return;
    }
  }

  private async checkSyncStatus(data) {
    const { id } = data;
    const document = await this.documentRepository.findOne({
      where: { id: id },
    });
    if (!document) return;
    if (document.syncStatus !== SyncStatus.PENDING_SYNC) return;
    document.syncStatus = SyncStatus.FAILED_SYNC;
    await this.documentRepository.save(document);
  }

  private async downloadFile(url: string, key: string) {
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
  }
}
