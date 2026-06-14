import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../authentication/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
