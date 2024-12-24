import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';

import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { UpdateInfoDto } from './dto/update-info.dto';
import { PermissionGuard } from 'src/guards/permission.guard';
import { Permissions } from 'src/decorators/permission.decorator';

@Controller('user')
@ApiTags('users')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionGuard)
@ApiBearerAuth()
@SkipThrottle()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('superadmin', 'officer')
  @Permissions('manage_users')
  @HttpCode(HttpStatus.OK)
  async create(@Body() createUserDto: CreateUserDto, @Req() request) {
    return await this.userService.create(createUserDto, request.user);
  }

  @Get()
  @Roles('superadmin', 'officer')
  @Permissions('manage_users')
  @HttpCode(HttpStatus.OK)
  async getAll(@Query() query: PaginationQueryDto, @Req() request) {
    return await this.userService.getAllUser(query, request.user);
  }

  @Get('/me')
  @HttpCode(HttpStatus.OK)
  async getInfo(@Req() req) {
    return await this.userService.getInfo(req.user);
  }

  @Get(':id')
  @Roles('superadmin', 'officer')
  @Permissions('manage_users')
  @HttpCode(HttpStatus.OK)
  async getById(@Param('id') id: number, @Req() request) {
    return await this.userService.getUserById(id, request.user);
  }

  @Put('/me')
  @HttpCode(HttpStatus.OK)
  async updateInfo(@Req() req, @Body() dto: UpdateInfoDto) {
    return await this.userService.updateInfo(req.user, dto);
  }

  @Put(':id')
  @Roles('superadmin', 'officer')
  @Permissions('manage_users')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request,
  ) {
    return await this.userService.updateUser(id, updateUserDto, request.user);
  }

  @Delete(':id')
  @Roles('superadmin', 'officer')
  @Permissions('manage_users')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req, @Param('id') id: number, @Req() request) {
    return await this.userService.deleteById(id, request.user);
  }
}
