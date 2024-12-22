import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  // Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { PermissionGuard } from 'src/guards/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from 'src/decorators/permission.decorator';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentPaginationQueryDto } from './dto/document-pagination-query.dto';
// import { SyncStatus } from './schemas/document.schema';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';

@Controller('document')
@ApiTags('documents')
@ApiBearerAuth()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('/upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents', 'manage_documents_properties')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async upload(@UploadedFile() file: Express.Multer.File) {
    return {
      key: await this.documentService.uploadDocument(file),
    };
  }

  @Post('/unload/:key')
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents', 'manage_documents_properties')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async unload(@Param('key') key: string) {
    return await this.documentService.unloadDocument(key);
  }

  @Get('/download/:id')
  @HttpCode(HttpStatus.OK)
  async downloadFile(
    @Param('id') id: number,
    // @Res({ passthrough: true }) res: Response,
  ) {
    return await this.documentService.downloadDocument(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents', 'manage_documents_properties')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return await this.documentService.updateDocument(id, updateDocumentDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents', 'manage_documents_properties')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: number) {
    return await this.documentService.deleteDocument(id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(@Param('id') id: number) {
    return await this.documentService.getDocumentById(id);
  }

  @Get()
  async getAll(@Query() query: DocumentPaginationQueryDto) {
    return await this.documentService.getAllDocument(query);
  }

  @Post('/sync/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents', 'manage_documents_properties')
  @HttpCode(HttpStatus.OK)
  async syncDocument(@Param('id') id: number) {
    return await this.documentService.syncDocument(id);
  }

  @Post('/unsync/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents', 'manage_documents_properties')
  @HttpCode(HttpStatus.OK)
  async unsyncDocument(@Param('id') id: number) {
    return await this.documentService.unsyncDocument(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents', 'manage_documents_properties')
  @HttpCode(HttpStatus.OK)
  async create(@Body() createDocumentDto: CreateDocumentDto) {
    return await this.documentService.createDocument(createDocumentDto);
  }

  /*   @Patch('/update-sync-status/:id')
  @HttpCode(HttpStatus.OK)
  async updateSyncStatus(
    @Param('id') id: number,
    @Body() body: { syncStatus: SyncStatus },
  ) {
    return await this.documentService.updateDocumentSyncStatus(
      id,
      body.syncStatus,
    );
  } */
}
