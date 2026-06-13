import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableVersioning({
    type:VersioningType.URI,
    prefix:'v',
    defaultVersion:'1'
  })

   const config = new DocumentBuilder()
    .setTitle('Buan Logistics API')
    .setDescription('Buan Logistics API description')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
