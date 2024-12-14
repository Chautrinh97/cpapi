import { Module } from '@nestjs/common';
import { IssuingBodyController } from './issuing-body.controller';
import { IssuingBodyService } from './issuing-body.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssuingBody } from './schemas/issuing-body.schema';
import { IssuingBodyRepository } from './issuing-body.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([IssuingBody]), UserModule],
  controllers: [IssuingBodyController],
  providers: [IssuingBodyService, IssuingBodyRepository],
  exports: [IssuingBodyService],
})
export class IssuingBodyModule {}
