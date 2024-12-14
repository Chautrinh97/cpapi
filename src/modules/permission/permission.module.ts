import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './schemas/permission.schema';
import { AuthorityGroup } from './schemas/authority-group.schema';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, AuthorityGroup])],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
