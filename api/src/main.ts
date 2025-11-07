 import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
 import { ValidationPipe } from '@nestjs/common';
 import { AppModule } from './app.module';
 import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: true, // DEV: allow all origins; tighten for production
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('SchoolPro API')
    .setDescription('API documentation for the School Management platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
