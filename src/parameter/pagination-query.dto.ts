import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  searchKey: string = '';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageNumber: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageLimit: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isExport: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  orderBy: string = 'createdAt asc';
}
