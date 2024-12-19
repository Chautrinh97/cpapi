import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TimestampMiddleware } from './middleware/timestamp.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentFieldModule } from './modules/document-field/document-field.module';
import { DocumentModule } from './modules/document/document.module';
import { DocumentTypeModule } from './modules/document-type/document-type.module';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './config/config.service';
import { AppConfigModule } from './config/config.module';
import { IssuingBodyModule } from './modules/issuing-body/issuing-body.module';
import { PermissionModule } from './modules/permission/permission.module';
import { APP_GUARD } from '@nestjs/core';
import { StatisticModule } from './modules/statistic/statistic.module';
import { BullModule } from '@nestjs/bullmq';
import { ConversationModule } from './modules/conversation/conversation.module';
// import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
  imports: [
    AppConfigModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PermissionModule,
    UserModule,
    DocumentFieldModule,
    DocumentTypeModule,
    DocumentModule,
    IssuingBodyModule,
    StatisticModule,
    ConversationModule,
    MailerModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: AppConfigService) => configService.mailConfig,
      inject: [AppConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: AppConfigService) =>
        configService.throttleConfig,
      inject: [AppConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: AppConfigService) => configService.dbConfig,
      inject: [AppConfigService],
    }),
    StatisticModule,
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: AppConfigService) => configService.bullConfig,
      inject: [AppConfigService],
    }),
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TimestampMiddleware)
      .exclude(
        '/auth/(.*)',
        '/auth',
        '/user/(.*)',
        '/user',
        '/document',
        '/document/(.*)',
        '/document-type',
        '/document-type/(.*)',
        '/document-field',
        '/document-field/(.*)',
        '/issuing-body',
        '/issuing-body/(.*)',
        '/permission',
        '/permission/(.*)',
        '/statistic',
        '/conversation',
        '/conversation/(.*)',
      )
      .forRoutes('*');
    // consumer.apply(LoggerMiddleware).forRoutes('*');
    //Use .exclude('route_to_exclude') to exclude some route out of middleware effect.
  }
}
