import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';
export class UpdateInfoDto {
  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  oldPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  newPassword: string;
}
