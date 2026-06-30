import { Module } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { ShipmentController } from './shipment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../authentication/auth.module';
import { SmtpProvider } from 'src/common/providers/smtp.provider';
import { FileUploadModule } from '../file-upload/file-upload.module';

@Module({
  imports: [PrismaModule, AuthModule, FileUploadModule],
  controllers: [ShipmentController],
  providers: [ShipmentService, SmtpProvider],
  exports: [ShipmentService],
})
export class ShipmentModule {}
