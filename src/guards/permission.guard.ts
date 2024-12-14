import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from 'src/modules/user/schemas/user.schema';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (user.role === 'superadmin') {
      return true;
    }

    const userWithAuthorityGroup =
      await this.userService.getUserWithAuthorityGroup(user.id);
    if (!userWithAuthorityGroup.authorityGroup) {
      throw new ForbiddenException("You don't have permission for this action");
    }

    const userPermissions =
      userWithAuthorityGroup.authorityGroup.permissions.map(
        (permission) => permission.name,
      );

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException("You don't have permission for this action");
    }
    return true;
  }
}
