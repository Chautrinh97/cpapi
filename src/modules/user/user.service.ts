import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from './schemas/user.schema';
import { UserRepository } from './user.repository';
import { hash } from 'src/utils/bcrypt';
import { VendorService } from 'src/modules/vendor/vendor.service';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PositionService } from '../position/position.service';
import { PermissionLevelEnum } from '../position/enum/permission-level.enum';
import { DepartmentService } from '../department/department.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => VendorService))
    private readonly vendorService: VendorService,
    @Inject(forwardRef(() => PositionService))
    private readonly positionService: PositionService,
    @Inject(forwardRef(() => DepartmentService))
    private readonly departmentService: DepartmentService,
    private readonly userRepository: UserRepository,
  ) {}

  async create(userToCreate, userVendor: User) {
    const user = await this.findByEmail(userToCreate.email);
    if (user) throw new BadRequestException('User aldready exists');

    if (userVendor) {
      await this.permissionLogicHandle(userToCreate);
      return await this.userRepository.create({
        ...userToCreate,
        vendorId: userVendor.vendorId,
        role: 'employee',
        password: await hash(userToCreate.password),
      });
    }
    return await this.userRepository.create({
      ...userToCreate,
      password: await hash(userToCreate.password),
    });
  }

  async getAll(user, query: PaginationQueryDto) {
    return await this.userRepository.getAll(user.vendorId, query);
  }

  async getUserByCondition(filter) {
    return await this.userRepository.findMany(filter);
  }

  async getById(id) {
    const user = await this.userRepository.findOne({ _id: id });
    if (!user) throw new NotFoundException('User not founds.');
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return await this.userRepository.findOne({ email: email });
  }

  async updateOne(filter, updateUserDto) {
    await this.userRepository.updateOne(filter, updateUserDto);
  }

  async updateMany(filter, data) {
    await this.userRepository.updateMany(filter, data);
  }

  async updateVendorUser(userVendor, userId, updateUserDto: UpdateUserDto) {
    const userForUpdate = await this.getById(userId);
    if (!userForUpdate) throw new NotFoundException('User not found.');
    if (userForUpdate.vendorId !== userVendor.vendorId)
      throw new ForbiddenException("Not your vendor's user");
    if (userForUpdate.isVerified)
      throw new ConflictException("User already verified, can't update user");
    if (updateUserDto.password) {
      updateUserDto.password = await hash(updateUserDto.password);
    }
    await this.permissionLogicHandle(updateUserDto);
    if (updateUserDto.email) {
      const existedUser = await this.userRepository.findOne({
        email: updateUserDto.email,
      });
      if (existedUser) throw new BadRequestException('Email already exist.');
    }
    return await this.userRepository.findOneAndUpdate(
      { _id: userId },
      updateUserDto,
    );
  }

  async updateInfo(userId, updateUserDto: UpdateUserDto) {
    const userForUpdate = await this.getById(userId);
    if (!userForUpdate) throw new NotFoundException('User not found.');
    if (updateUserDto.password) {
      updateUserDto.password = await hash(updateUserDto.password);
    }
    return await this.userRepository.findOneAndUpdate(
      { _id: userId },
      updateUserDto,
    );
  }

  async deleteById(owner, userId: string) {
    const user = await this.userRepository.findOne({ _id: userId });
    if (!user) throw new NotFoundException('Not found user');
    if (user.id === owner.id)
      throw new ConflictException("You can't delete yourself");
    if (owner.vendorId !== user.vendorId)
      throw new ForbiddenException("Not your vendor's user");
    return await this.userRepository.deleteOne({ _id: userId });
  }

  //------------------------------PRIVATE-METHOD--------------------------------
  //------------------------------PRIVATE-METHOD--------------------------------
  //------------------------------PRIVATE-METHOD--------------------------------

  async permissionLogicHandle(userForVerify) {
    const newDepartmentId = userForVerify.departmentId;
    const newPositionId = userForVerify.positionId;
    if (!newDepartmentId) {
      if (newPositionId) {
        const newPosition = await this.positionService.getById(newPositionId);
        if (!newPosition) throw new NotFoundException('Position not found');
        if (newPosition.permissionLevel !== PermissionLevelEnum.Full) {
          throw new ConflictException(
            'User not in a department could not have that position',
          );
        }
      }
      return;
    }
    const newDepartment = await this.departmentService.getById(newDepartmentId);
    if (!newDepartment) throw new NotFoundException('Department not found');
  }
}
