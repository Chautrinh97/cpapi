import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/parameter/pagination-query.dto';

export class DocumentPaginationQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  documentType: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  documentField: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  issuingBody: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true',
  )
  isRegulatory: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true',
  )
  isValid: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true',
  )
  isSync: boolean;
}
