import { Module } from '@nestjs/common';
import { IntakeParcelController } from './intake-parcel.controller';
import { IntakeParcelService } from './intake-parcel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { AuthModule } from '../authentication';

@Module({
  imports: [PrismaModule, FileUploadModule, AuthModule],
  controllers: [IntakeParcelController],
  providers: [IntakeParcelService],
})
export class IntakeParcelModule {}
