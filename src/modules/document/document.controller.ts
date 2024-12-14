import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
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
import { ConfigService } from '@nestjs/config';

@Controller('document')
@ApiTags('documents')
@ApiBearerAuth()
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('manage_documents')
  async create(@Req() req, @Body() createDocumentDto: CreateDocumentDto) {
    return await this.documentService.createDocument(
      req.user,
      createDocumentDto,
    );
  }

  @Post('/upload')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('manage_documents')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    return {
      key: await this.documentService.uploadDocument(file),
    };
  }

  @Get('/download/:id')
  async downloadFile(
    @Param('id') id: number,
    // @Res({ passthrough: true }) res: Response,
  ) {
    return await this.documentService.downloadDocument(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('manage_documents')
  async update(
    @Param('id') id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return await this.documentService.updateDocument(id, updateDocumentDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('manage_documents')
  async delete(@Param('id') id: number) {
    return await this.documentService.deleteDocument(id);
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return await this.documentService.getDocumentById(id);
  }

  @Get()
  async getAll(@Query() query: DocumentPaginationQueryDto) {
    return await this.documentService.getAllDocument(query);
  }
}
