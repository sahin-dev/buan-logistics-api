import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
<<<<<<< HEAD
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiBody, ApiQuery } from "@nestjs/swagger";
=======
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
>>>>>>> 23297c505d429a4cfd9792716a8f892f69caea48
import { QuoteService } from "./quote.service";
import { CreateQuoteDto } from "./dtos/create-quote.dto";
import { ReplyQuoteDto } from "./dtos/reply-quote.dto";
import { JwtAuthGuard } from "src/common/guards/auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { Role } from "generated/prisma/enums";
import { PaginationQueryDto } from "src/common/dtos/pagination-query.dto";

@ApiTags("Quotes")
@Controller("quotes")
@Controller()
export class QuoteController {
    constructor(private readonly quoteService: QuoteService) {}

    /**
     * Submit a quote request (Public)
     */
    @Post()
    @UseInterceptors(FileInterceptor("uploadImage"))
    @ApiOperation({ summary: "Submit a new quote request" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({ type: CreateQuoteDto })
    @ApiResponse({ status: 201, description: "Quote submitted successfully" })
    @ApiResponse({ status: 400, description: "Bad request" })
    async submitQuote(
        @Body() dto: CreateQuoteDto,
        @UploadedFile() file?: any,
    ) {
        return this.quoteService.createQuote(dto, file);
    }

    /**
     * View all quote requests (Admin only)
     */
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
<<<<<<< HEAD
    @ApiOperation({ summary: "Get all submitted quote requests (Admin only, paginated, supports search and filters)" })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by customer name, email, phone, or pickup details' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by quote status' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter createdAt on or after this date' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter createdAt on or before this date' })
=======
    @ApiOperation({ summary: "Get all submitted quote requests (Admin only, paginated)" })
>>>>>>> 23297c505d429a4cfd9792716a8f892f69caea48
    @ApiResponse({ status: 200, description: "Successfully retrieved list of quotes" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    async getQuotes(@Query() query: PaginationQueryDto) {
        return this.quoteService.getQuotes(query);
    }

    /**
     * Get a single quote request (Admin only)
     */
    @Get(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get a single quote request by ID (Admin only)" })
    @ApiResponse({ status: 200, description: "Successfully retrieved quote details" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Quote not found" })
    async getQuoteById(@Param("id") id: string) {
        return this.quoteService.getQuoteById(id);
    }

    /**
     * Reply to a quote request (Admin only)
     */
    @Post(":id/reply")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Reply to a quote request and send an email response (Admin only)" })
    @ApiResponse({ status: 200, description: "Successfully replied to the quote" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Quote not found" })
    async replyToQuote(
        @Param("id") id: string,
        @Body() dto: ReplyQuoteDto,
    ) {
        return this.quoteService.replyToQuote(id, dto.message);
    }
}
