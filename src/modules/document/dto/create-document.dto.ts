import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty()
  @IsOptional()
  issuanceDate?: Date;

  @ApiProperty()
  @IsOptional()
  effectiveDate?: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true',
  )
  isRegulatory?: boolean;

  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true',
  )
  validityStatus?: boolean;

  @ApiProperty()
  @IsOptional()
  unvalidDate?: Date;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  documentFieldId?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  documentTypeId?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  issuingBodyId?: number;

  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsNumber()
  documentSize: number;
}
