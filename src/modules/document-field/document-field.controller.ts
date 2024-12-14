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
import { DocumentFieldService } from './document-field.service';
import { CreateDocumentFieldDto } from './dto/create-document-field.dto';
import { UpdateDocumentFieldDto } from './dto/update-document-field.dto';

@Controller('document-field')
@ApiTags('document fields')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@ApiBearerAuth()
export class DocumentFieldController {
  constructor(private readonly documentFieldService: DocumentFieldService) {}

  @Get()
  async getAll(@Query() query: PaginationQueryDto) {
    return this.documentFieldService.getAllDocumentFields(query);
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.documentFieldService.getDocumentFieldById(id);
  }

  @Post()
  @Permissions('manage_document_fields')
  async create(@Body() createDocumentFieldDto: CreateDocumentFieldDto) {
    return this.documentFieldService.createDocumentField(
      createDocumentFieldDto,
    );
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('manage_document_fields')
  async update(
    @Param('id') id: number,
    @Body() updateDocumentFieldDto: UpdateDocumentFieldDto,
  ) {
    return this.documentFieldService.updateDocumentField(
      id,
      updateDocumentFieldDto,
    );
  }

  @Delete(':id')
  @Permissions('manage_document_fields')
  async delete(@Param('id') id: number) {
    return this.documentFieldService.deleteDocumentField(id);
  }
}
