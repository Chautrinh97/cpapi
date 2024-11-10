import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import * as dotenv from 'dotenv';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { TimestampMiddleware } from './middleware/timestamp.middleware';

dotenv.config();
@Module({
  imports: [
    AuthModule,
    UserModule,
    MailerModule.forRootAsync({
      useFactory: async () => ({
        transport: {
          host: process.env.MAIL_HOST,
          secure: false,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
          },
        },
        defaults: {
          from: `Chatbot <${process.env.MAIL_FROM}>`,
        },
        template: {
          dir: join(__dirname, '..', 'src', 'templates', 'email'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 5,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TimestampMiddleware)
      .exclude('/auth/(.*)', '/auth', '/users/(.*)', '/users')
      .forRoutes('*');
    //Use .exclude('route_to_exclude') to exclude some route out of middleware effect.
  }
}
