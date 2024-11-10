import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ConfirmEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  token: string;
}
