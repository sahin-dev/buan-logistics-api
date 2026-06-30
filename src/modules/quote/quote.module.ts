import { Module } from "@nestjs/common";
import { QuoteController } from "./quote.controller";
import { QuoteService } from "./quote.service";
import { PrismaModule } from "../prisma/prisma.module";
import { FileUploadModule } from "../file-upload/file-upload.module";
import { AuthModule } from "../authentication/auth.module";
import { SmtpProvider } from "src/common/providers/smtp.provider";

@Module({
    imports: [PrismaModule, FileUploadModule, AuthModule],
    controllers: [QuoteController],
    providers: [QuoteService, SmtpProvider],
    exports: [QuoteService],
})
export class QuoteModule {}
