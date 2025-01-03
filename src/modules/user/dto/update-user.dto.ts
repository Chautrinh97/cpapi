import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true',
  )
  isDisabled?: boolean;

  @IsOptional()
  @IsString()
  password?: string;
}
