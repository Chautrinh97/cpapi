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
import { UserRole } from './schemas/user.schema';
import { Permission } from '../permission/schemas/permission.schema';
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

  async create(dto: CreateUserDto, requestUser: any) {
    const existeduser = await this.userRepository.findOneBy({
      email: dto.email,
    });
    if (existeduser) throw new ConflictException('EXIST_EMAIL');

    const user = await this.userRepository.create();

    if (dto.authorityGroup) {
      const authorityGroup = await this.permissionService.getAuthorityGroupById(
        dto.authorityGroup,
      );
      if (!authorityGroup)
        throw new NotFoundException('Authority group is not found');
      const userWhoCreating = await this.userRepository.findOne({
        where: { id: requestUser.id },
      });
      if (userWhoCreating.role !== UserRole.SUPERAMIN)
        throw new ForbiddenException(
          "You're not allowed to set user authority group",
        );
      if (dto.role === UserRole.GUEST)
        throw new ConflictException("Can't set authority for guest");
      user.authorityGroup = authorityGroup;
    }

    Object.assign(user, {
      ...dto,
      password: await hash(dto.password),
    });
    return await this.userRepository.save(user);
  }

  async getAllUser(query: PaginationQueryDto, userRequest: any) {
    if (userRequest.role === UserRole.SUPERAMIN)
      return await this.userRepository.getAll(query);
    return await this.userRepository.getAll(query, userRequest.id);
  }

  async getUserById(id: number, requestUser: any) {
    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ['authorityGroup', 'authorityGroup.permissions'],
    });
    if (!user) throw new NotFoundException('User not founds.');
    const userWhoGetting = await this.userRepository.findOne({
      where: { id: requestUser.id },
    });
    if (
      userWhoGetting.role !== UserRole.SUPERAMIN &&
      user.authorityGroup?.permissions.some(
        (permission: Permission) => permission.name === 'manage_users',
      )
    ) {
      throw new ForbiddenException("You're not allow to get this user info.");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async updateUser(id: number, dto: UpdateUserDto, requestUser: any) {
    const userForUpdate = await this.userRepository.findOne({
      where: { id: id },
      relations: ['authorityGroup', 'authorityGroup.permissions'],
    });
    if (!userForUpdate) {
      throw new NotFoundException('NOT_FOUND_USER');
    }

    const userWhoUpdating = await this.userRepository.findOne({
      where: { id: requestUser.id },
    });

    if (
      userWhoUpdating.role !== UserRole.SUPERAMIN &&
      userForUpdate.authorityGroup?.permissions.some(
        (permission: Permission) => permission.name === 'manage_users',
      )
    ) {
      throw new ForbiddenException('NOT_ALLOW_UPDATE_USER');
    }

    if (dto.password && dto.password !== '') {
      dto.password = await hash(dto.password);
    } else {
      dto.password = undefined;
    }

    if (userForUpdate.isVerified) {
      if (dto.email && dto.email !== userForUpdate.email)
        throw new ForbiddenException('VERIFIED_USER');
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
        throw new ConflictException('EXIST_EMAIL');
      }
    }

    if (dto.authorityGroup) {
      const authorityGroup = await this.permissionService.getAuthorityGroupById(
        dto.authorityGroup,
      );
      if (!authorityGroup)
        throw new NotFoundException('NOT_FOUND_AUTHORITY_GROUP');

      if (userWhoUpdating.role !== UserRole.SUPERAMIN)
        throw new ForbiddenException('NOT_ALLOW_SET_AUTHORITY');
      if (dto.role === UserRole.GUEST)
        throw new ForbiddenException('GUESS_ACCOUNT');
      userForUpdate.authorityGroup = authorityGroup;
    }

    Object.assign(userForUpdate, dto);

    await this.userRepository.save(userForUpdate);
  }

  async deleteById(userId: number, requestUser: any) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['authorityGroup', 'authorityGroup.permissions'],
    });
    if (!user) throw new NotFoundException('User not founds.');
    const userWhoDeleting = await this.userRepository.findOne({
      where: { id: requestUser.id },
    });
    if (
      userWhoDeleting.role !== UserRole.SUPERAMIN &&
      user.authorityGroup?.permissions.some(
        (permission: Permission) => permission.name === 'manage_users',
      )
    ) {
      throw new ForbiddenException(
        "You're not allow to delete this user info.",
      );
    }
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
    return {
      user: {
        userId: userInfo.id,
        email: userInfo.email,
        fullName: userInfo.fullName,
        role: userInfo.role,
        permissions: userInfo.authorityGroup?.permissions.map(
          (perm: any) => perm.name,
        ),
      },
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
