import { Module } from '@nestjs/common';
import { StatisticController } from './statistic.controller';
import { StatisticService } from './statistic.service';
import { DocumentModule } from '../document/document.module';
import { IssuingBodyModule } from '../issuing-body/issuing-body.module';
import { DocumentTypeModule } from '../document-type/document-type.module';
import { DocumentFieldModule } from '../document-field/document-field.module';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [StatisticController],
  providers: [StatisticService],
  imports: [
    DocumentModule,
    IssuingBodyModule,
    DocumentTypeModule,
    DocumentFieldModule,
    UserModule,
  ],
})
export class StatisticModule {}
