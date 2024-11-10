import { IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class EmailRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
