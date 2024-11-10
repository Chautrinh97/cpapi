import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';

@ApiTags('users')
@ApiHeader({
  name: 'timestamp',
  description: "request's timestamp to prevent attack",
})
@SkipThrottle()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('vendorowner')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async create(@Req() request, @Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto, request.user);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('vendorowner')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async getAll(@Req() req, @Query() query: PaginationQueryDto) {
    return await this.userService.getAll(req.user, query);
  }

  @Get('vendor/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('vendorowner')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async getUserById(@Req() req, @Param('id') id: string) {
    const user = await this.userService.getById(id);
    if (req.user.vendorId !== user.vendorId)
      throw new ForbiddenException("Not your vendor's user");
    return user;
  }

  @Get('/info')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async getInfo(@Req() req) {
    return await this.userService.getById(req.user.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('vendorowner')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Req() req,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.updateVendorUser(req.user, id, updateUserDto);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async updateInfo(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.updateInfo(req.user.id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('vendorowner')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req, @Param('id') id: string) {
    return await this.userService.deleteById(req.user, id);
  }
}
