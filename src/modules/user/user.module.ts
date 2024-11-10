import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserSchema, User } from './schemas/user.schema';
import { UserRepository } from './user.repository';
import { VendorModule } from 'src/modules/vendor/vendor.module';
import { PositionModule } from '../position/position.module';
import { DepartmentModule } from '../department/department.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => VendorModule),
    forwardRef(() => PositionModule),
    forwardRef(() => DepartmentModule),
  ],
  providers: [UserService, UserRepository],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
