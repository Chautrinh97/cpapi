import { PartialType } from '@nestjs/mapped-types';
import { CreateIssuingBodyDto } from './create-issuing-body.dto';

export class UpdateIssuingBodyDto extends PartialType(CreateIssuingBodyDto) {}
