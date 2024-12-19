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
import { IssuingBodyService } from './issuing-body.service';
import { AuthGuard } from '@nestjs/passport';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { CreateIssuingBodyDto } from './dto/create-issuing-body.dto';
import { UpdateIssuingBodyDto } from './dto/update-issuing-body.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';

@Controller('issuing-body')
@ApiTags('issuing bodies')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
@ApiBearerAuth()
export class IssuingBodyController {
  constructor(private readonly issuingBodyService: IssuingBodyService) {}

  @Get()
  async getAll(@Query() query: PaginationQueryDto) {
    return this.issuingBodyService.getAllIssuingBodies(query);
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.issuingBodyService.getIssuingBodyById(id);
  }

  @Post()
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents_properties')
  async create(@Body() createIssuingBodyDto: CreateIssuingBodyDto) {
    return this.issuingBodyService.createIssuingBody(createIssuingBodyDto);
  }

  @Put(':id')
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents_properties')
  async update(
    @Param('id') id: number,
    @Body() updateIssuingBodyDto: UpdateIssuingBodyDto,
  ) {
    return this.issuingBodyService.updateIssuingBody(id, updateIssuingBodyDto);
  }

  @Delete(':id')
  @Roles('superadmin', 'officer')
  @Permissions('manage_documents_properties')
  async delete(@Param('id') id: number) {
    return this.issuingBodyService.deleteIssuingBody(id);
  }
}
