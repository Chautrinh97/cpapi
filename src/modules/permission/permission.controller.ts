import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionService } from './permission.service';
import { CreateAuthorityGroupDto } from './dto/create-authority-group.dto';
import { UpdateAuthorityGroupDto } from './dto/update-authority-group.dto';

@Controller('permission')
@ApiTags('permissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('superadmin')
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllAuthorityGroup() {
    return await this.permissionService.getAllAuthorityGroups();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(@Param('id') id: number) {
    return await this.permissionService.getAuthorityGroupById(id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createAuthorityGroup(
    @Body() createAuthorityGroupDto: CreateAuthorityGroupDto,
  ) {
    return this.permissionService.createAuthorityGroup(createAuthorityGroupDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateAuthorityGroup(
    @Param('id') id: number,
    @Body() updateAuthorityGroup: UpdateAuthorityGroupDto,
  ) {
    return this.permissionService.updateAuthorityGroup(
      id,
      updateAuthorityGroup,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteAuthorityGroup(@Param('id') id: number) {
    return this.permissionService.deleteAuthorityGroup(id);
  }
}
