import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { compare, hash } from 'src/utils/bcrypt';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PermissionService } from '../permission/permission.service';
// import { AuthService } from '../auth/auth.service';
// import { ModuleRef } from '@nestjs/core';
import { UpdateInfoDto } from './dto/update-info.dto';
@Injectable()
export class UserService implements OnModuleInit {
  // private authService: AuthService;
  constructor(
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
    private readonly userRepository: UserRepository,
    // private moduleRef: ModuleRef,
  ) {}
  onModuleInit() {
    // this.authService = this.moduleRef.get(AuthService, { strict: false });
  }

  async create(dto: CreateUserDto) {
    const existeduser = await this.userRepository.findOneBy({
      email: dto.email,
    });
    if (existeduser) throw new ConflictException('Email aldready exists');

    const user = await this.userRepository.create();

    if (dto.authorityGroup) {
      const authorityGroup = await this.permissionService.getAuthorityGroupById(
        dto.authorityGroup,
      );
      if (!authorityGroup)
        throw new NotFoundException('Authority group is not found');
      user.authorityGroup = authorityGroup;
    }

    Object.assign(user, {
      ...dto,
      password: await hash(dto.password),
    });

    // await this.authService.sendConfirmEmail(user.email);

    return await this.userRepository.save(user);
  }

  async getAll(query: PaginationQueryDto) {
    return await this.userRepository.getAll(query);
  }

  async getById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ['authorityGroup'],
    });
    if (!user) throw new NotFoundException('User not founds.');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    const userForUpdate = await this.userRepository.findOne({ where: { id } });
    if (!userForUpdate) {
      throw new NotFoundException('User not found');
    }

    if (dto.password) {
      dto.password = await hash(dto.password);
    }

    if (
      userForUpdate.isVerified &&
      dto.email &&
      dto.email !== userForUpdate.email
    ) {
      throw new ForbiddenException("User's email already verified.");
    }

    if (
      !userForUpdate.isVerified &&
      dto.email &&
      dto.email !== userForUpdate.email
    ) {
      const existingUserWithEmail = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existingUserWithEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    if (dto.authorityGroup) {
      const authorityGroup = await this.permissionService.getAuthorityGroupById(
        dto.authorityGroup,
      );
      if (!authorityGroup) {
        throw new NotFoundException('Authority group not found');
      }
      userForUpdate.authorityGroup = authorityGroup;
    }

    Object.assign(userForUpdate, dto);

    await this.userRepository.save(userForUpdate);
  }

  async deleteById(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Not found user');
    return await this.userRepository.delete({ id: userId });
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email: email },
      relations: ['authorityGroup', 'authorityGroup.permissions'],
    });
  }

  async updateOne(filter, updateUserDto) {
    await this.userRepository.update(filter, updateUserDto);
  }

  async getUserWithAuthorityGroup(id: number) {
    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ['authorityGroup', 'authorityGroup.permissions'],
    });
    return user;
  }

  async getInfo(user) {
    const userInfo = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['authorityGroup', 'authorityGroup.permissions'],
    });
    if (!userInfo) throw new NotFoundException('User not found.');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitizedUser } = user;
    return {
      user: sanitizedUser,
    };
  }

  async updateInfo(user, dto: UpdateInfoDto) {
    const userForUpdate = await this.userRepository.findOne({
      where: { id: user.id },
    });
    if (!userForUpdate) return new NotFoundException('User not found.');

    const isMatchedPassword = await compare(
      dto.oldPassword,
      userForUpdate.password,
    );
    if (!isMatchedPassword)
      throw new ConflictException('Old password not correct.');

    userForUpdate.password = await hash(dto.newPassword);
    await this.userRepository.save(userForUpdate);
  }
}
