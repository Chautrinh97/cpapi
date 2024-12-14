import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/decorators/permission.decorator';
import { PermissionGuard } from 'src/guards/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { DocumentTypeService } from './document-type.service';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

@Controller('document-type')
@ApiTags('document types')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@ApiBearerAuth()
export class DocumentTypeController {
  constructor(private readonly documentTypeService: DocumentTypeService) {}

  @Get()
  async getAll(@Query() query: PaginationQueryDto) {
    return this.documentTypeService.getAllDocumentTypes(query);
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.documentTypeService.getDocumentTypeById(id);
  }

  @Post()
  @Permissions('manage_document_types')
  async create(@Body() createDocumentTypeDto: CreateDocumentTypeDto) {
    return this.documentTypeService.createDocumentType(createDocumentTypeDto);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('manage_document_types')
  async update(
    @Param('id') id: number,
    @Body() updateDocumentTypeDto: UpdateDocumentTypeDto,
  ) {
    return this.documentTypeService.updateDocumentType(
      id,
      updateDocumentTypeDto,
    );
  }

  @Delete(':id')
  @Permissions('manage_document_types')
  async delete(@Param('id') id: number) {
    return this.documentTypeService.deleteDocumentType(id);
  }
}