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

@Controller('issuing-body')
@ApiTags('issuing bodies')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
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
  @Permissions('manage_issuing_bodies')
  async create(@Body() createIssuingBodyDto: CreateIssuingBodyDto) {
    return this.issuingBodyService.createIssuingBody(createIssuingBodyDto);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('manage_issuing_bodies')
  async update(
    @Param('id') id: number,
    @Body() updateIssuingBodyDto: UpdateIssuingBodyDto,
  ) {
    return this.issuingBodyService.updateIssuingBody(id, updateIssuingBodyDto);
  }

  @Delete(':id')
  @Permissions('manage_issuing_bodies')
  async delete(@Param('id') id: number) {
    return this.issuingBodyService.deleteIssuingBody(id);
  }
}
