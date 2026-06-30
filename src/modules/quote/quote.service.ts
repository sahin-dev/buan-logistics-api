import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateQuoteDto } from "./dtos/create-quote.dto";
import { FileUploadService } from "../file-upload/file-upload.service";
import { SmtpProvider } from "src/common/providers/smtp.provider";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";
import { PaginatedResponseDto } from "src/common/dtos/paginated-response.dto";
import { QuoteStatus } from "generated/prisma/enums";

@Injectable()
export class QuoteService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly fileUploadService: FileUploadService,
        private readonly smtpProvider: SmtpProvider,
    ) {}

    /**
     * Submit a quote request
     */
    async createQuote(dto: CreateQuoteDto, imageFile?: Express.Multer.File) {
        let uploadImagePath: string | undefined;

        if (imageFile) {
            const uploadResult = await this.fileUploadService.uploadFile(imageFile);
            uploadImagePath = uploadResult.filePath;
        }

        const quote = await this.prisma.quote.create({
            data: {
                shipmentType: dto.shipmentType,
                country: dto.country,
                pickupServices: dto.pickupServices,
                fullName: dto.fullName,
                phone: dto.phone,
                address: dto.address,
                whatWeArePickingUp: dto.whatWeArePickingUp,
                email: dto.email,
                shippingType: dto.shippingType,
                weightOrVolume: dto.weightOrVolume,
                uploadImage: uploadImagePath,
                receiverCountry: dto.receiverCountry,
                receiverFullName: dto.receiverFullName,
                receiverPhone: dto.receiverPhone,
                receiverEmail: dto.receiverEmail,
                receiverAddress: dto.receiverAddress,
                status: QuoteStatus.PENDING,
            },
        });

        return quote;
    }

    /**
     * Get paginated quotes for admin
     */
    async getQuotes(query: PaginationQueryDto) {
        const { page, limit, search } = query;
        const skip = query.getSkip();

        const where: any = search
            ? {
                  OR: [
                      { fullName: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                      { phone: { contains: search, mode: "insensitive" } },
                      { whatWeArePickingUp: { contains: search, mode: "insensitive" } },
                  ],
              }
            : {};

        const [quotes, totalItems] = await Promise.all([
            this.prisma.quote.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.quote.count({ where }),
        ]);

        return PaginatedResponseDto.create(quotes, totalItems, page, limit);
    }

    /**
     * Get single quote details by ID
     */
    async getQuoteById(id: string) {
        const quote = await this.prisma.quote.findUnique({
            where: { id },
        });

        if (!quote) {
            throw new NotFoundException(`Quote with ID ${id} not found`);
        }

        return quote;
    }

    /**
     * Admin replies to a quote request via email
     */
    async replyToQuote(id: string, replyMessage: string) {
        const quote = await this.getQuoteById(id);

        // Update quote status and reply message
        const updatedQuote = await this.prisma.quote.update({
            where: { id },
            data: {
                status: QuoteStatus.REPLIED,
                replyMessage,
                repliedAt: new Date(),
            },
        });

        // Send email to applicant
        await this.smtpProvider.sendMail({
            to: quote.email,
            subject: `Buan Logistics - Reply to Quote Request #${quote.id.substring(0, 8)}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #1a73e8; text-align: center;">Quote Request Reply</h2>
                    <p>Dear <strong>${quote.fullName}</strong>,</p>
                    <p>We have reviewed your recent quote request for shipping from <strong>${quote.country}</strong> to <strong>${quote.receiverCountry}</strong>.</p>
                    <p>Here is our response regarding your request:</p>
                    <div style="background-color: #f1f3f4; padding: 15px; border-radius: 5px; border-left: 4px solid #1a73e8; margin: 20px 0; white-space: pre-line;">
                        ${replyMessage}
                    </div>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
                    <p style="color: #5f6368; font-size: 12px;">This is an automated reply. If you have any further questions, please contact our support team.</p>
                    <p style="color: #9aa0a6; font-size: 11px; text-align: center;">Buan Logistics API Service</p>
                </div>
            `,
        });

        return updatedQuote;
    }
}
