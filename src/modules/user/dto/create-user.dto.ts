import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MinLength,
  IsString,
} from 'class-validator';
export class CreateUserDto {
  @ApiProperty()
  @IsOptional()
  fullName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password: string;

  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsOptional()
  authorityGroup?: number;
}
