import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'fatal'],
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  const config = new DocumentBuilder()
    .setTitle('Chatbot API')
    .setDescription('This is Chatbot API document')
    .setVersion('1.0')
    .addTag('ChatbotAPI')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.use(cookieParser());
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  await app.listen(process.env.PORT);
}
bootstrap();
