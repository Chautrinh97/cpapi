import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Permission } from './schemas/permission.schema';
import { In, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorityGroup } from './schemas/authority-group.schema';
import { CreateAuthorityGroupDto } from './dto/create-authority-group.dto';
import { UpdateAuthorityGroupDto } from './dto/update-authority-group.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(AuthorityGroup)
    private readonly authorityGroupRepository: Repository<AuthorityGroup>,
  ) {}

  async getAuthorityGroupById(id: number) {
    return await this.authorityGroupRepository.findOne({
      where: { id: id },
      relations: ['permissions'],
    });
  }

  async getAllAuthorityGroups() {
    const data = await this.authorityGroupRepository.find({
      where: { id: Not(1) },
      relations: ['permissions'],
    });
    return {
      data: data,
    };
  }

  async createAuthorityGroup(dto: CreateAuthorityGroupDto) {
    const { name, description, permissionIds } = dto;

    let permissions = [];
    if (permissionIds && permissionIds.length > 0) {
      permissions = await this.permissionRepository.find({
        where: { id: In(permissionIds) },
      });

      if (permissions.length !== permissionIds.length) {
        throw new NotFoundException('One or more permission IDs are invalid');
      }
    }

    const existedNameAuthorityGroup =
      await this.authorityGroupRepository.findOne({
        where: { name: name },
      });
    if (existedNameAuthorityGroup) {
      throw new ConflictException('Exist authority group name');
    }

    const permissionGroup = this.authorityGroupRepository.create({
      name,
      description,
      permissions,
    });

    return await this.authorityGroupRepository.save(permissionGroup);
  }

  async updateAuthorityGroup(id: number, dto: UpdateAuthorityGroupDto) {
    const { name, description, permissionIds } = dto;

    const authorityGroup = await this.authorityGroupRepository.findOne({
      where: { id: id },
      relations: ['permissions'],
    });

    if (!authorityGroup) {
      throw new NotFoundException('Authority group is not found');
    }

    let permissions = [];
    if (permissionIds) {
      permissions = await this.permissionRepository.find({
        where: { id: In(permissionIds) },
      });

      if (permissions.length !== permissionIds.length) {
        throw new NotFoundException('One or more permission IDs are invalid');
      }
    }

    if (name) {
      const existedNameAuthorityGroup =
        await this.authorityGroupRepository.findOne({
          where: { name: name, id: Not(id) },
        });

      if (existedNameAuthorityGroup) {
        throw new ConflictException('Exist authority group name');
      }
    }

    authorityGroup.name = name ?? authorityGroup.name;
    authorityGroup.description = description ?? authorityGroup.description;
    if (permissionIds) {
      authorityGroup.permissions = permissions;
    }

    return await this.authorityGroupRepository.save(authorityGroup);
  }

  async deleteAuthorityGroup(id: number) {
    const existedAuthorityGroup = await this.authorityGroupRepository.findOne({
      where: { id },
    });

    if (!existedAuthorityGroup) {
      throw new NotFoundException('Authority group is not found');
    }

    await this.authorityGroupRepository.remove(existedAuthorityGroup);
  }
}
