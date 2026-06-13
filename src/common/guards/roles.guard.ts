import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { TokenPayload } from 'src/modules/authentication/interfaces/TokenPayload';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const payload = request['payload'] as TokenPayload;


    if (!payload) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.includes(payload.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `User with role '${payload.role}' does not have access to this resource. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
