import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/decorators/permission.decorator';
import { PermissionGuard } from 'src/guards/permission.guard';
import { StatisticService } from './statistic.service';
import { DocumentStatisticQueryDto } from '../document/dto/document-statistic-query.dto';

@Controller('statistic')
@ApiTags('statistics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Permissions('view_documents_statistic')
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}
  @Get()
  @HttpCode(HttpStatus.OK)
  async getStatistic(@Query() query: DocumentStatisticQueryDto) {
    return this.statisticService.getStatistic(query);
  }
}
