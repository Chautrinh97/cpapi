import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthorityGroupDto } from './create-authority-group.dto';

export class UpdateAuthorityGroupDto extends PartialType(
  CreateAuthorityGroupDto,
) {}
