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

@Controller('user')
@ApiTags('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
@SkipThrottle()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('superadmin')
  @HttpCode(HttpStatus.OK)
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Get()
  @Roles('superadmin')
  @HttpCode(HttpStatus.OK)
  async getAll(@Query() query: PaginationQueryDto) {
    return await this.userService.getAll(query);
  }
  @Get('/me')
  @HttpCode(HttpStatus.OK)
  async getInfo(@Req() req) {
    return await this.userService.getInfo(req.user);
  }

  @Get(':id')
  @Roles('superadmin')
  @HttpCode(HttpStatus.OK)
  async getById(@Param('id') id: number) {
    return await this.userService.getById(id);
  }

  @Put('/me')
  @HttpCode(HttpStatus.OK)
  async updateInfo(@Req() req, @Body() dto: UpdateInfoDto) {
    return await this.userService.updateInfo(req.user, dto);
  }

  @Put(':id')
  @Roles('superadmin')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('superadmin')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req, @Param('id') id: number) {
    return await this.userService.deleteById(id);
  }
}
