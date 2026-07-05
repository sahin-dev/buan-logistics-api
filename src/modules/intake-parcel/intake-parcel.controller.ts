import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from 'generated/prisma/enums';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { FileUploadService } from '../file-upload/file-upload.service';
import { CreateIntakeParcelDto } from './dtos/create-intake-parcel.dto';
import { IntakeParcelService } from './intake-parcel.service';

@ApiTags('Intake Parcels')
@Controller('intake-parcels')
export class IntakeParcelController {
  constructor(
    private readonly intakeParcelService: IntakeParcelService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Intake a parcel into the logged-in hub provider hub' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string', example: 'Karim Ahmed' },
        phone: { type: 'string', example: '+8801700000000' },
        address: { type: 'string', example: 'House 12, Road 4, Dhaka' },
        package_info: { type: 'string', example: 'Small electronics parcel', nullable: true },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['full_name', 'phone', 'address'],
    },
  })
  async create(
    @Body() dto: CreateIntakeParcelDto,
    @Request() req: any,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    let imageUrls: string[] = [];
    if (images && images.length > 0) {
      const result = await this.fileUploadService.uploadMultipleFiles(images);
      imageUrls = result.filePaths;
    }

    return this.intakeParcelService.create(
      dto,
      imageUrls,
      req.payload.userId,
    );
  }

  @Put(':id/handed-over')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hub provider marks an intake parcel as handed over to branch' })
  async markHandedOver(@Param('id') id: string, @Request() req: any) {
    return this.intakeParcelService.markHandedOver(id, req.payload.userId);
  }

  @Put(':id/arrived-at-branch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark an intake parcel as arrived at branch before creating shipment separately',
  })
  async markArrivedAtBranch(@Param('id') id: string) {
    return this.intakeParcelService.markArrivedAtBranch(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all intake parcels (Admin / Branch)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAll(@Query() query: PaginationQueryDto) {
    return this.intakeParcelService.getAll(query);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get intake parcels for logged-in hub provider' })
  async getMine(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.intakeParcelService.getMine(req.payload.userId, query);
  }

  @Get('my/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analytics for logged-in hub provider intake parcels' })
  async getMineAnalytics(@Request() req: any) {
    return this.intakeParcelService.getMineAnalytics(req.payload.userId);
  }

  @Get('branch/incoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Branch dashboard: incoming intake parcels from branch hubs' })
  async getBranchIncomingParcels(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.intakeParcelService.getBranchIncomingParcels(req.payload.userId, query);
  }

  @Get('branch/arrived')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Branch dashboard: intake parcels already arrived at branch' })
  async getBranchArrivedParcels(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.intakeParcelService.getBranchArrivedParcels(req.payload.userId, query);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Global intake parcel analytics for admin/branch dashboards' })
  async getAnalytics() {
    return this.intakeParcelService.getAnalytics();
  }

  @Get('summary/hub-providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin summary: which hub provider intaked how many parcels' })
  async getHubProviderSummary() {
    return this.intakeParcelService.getHubProviderSummary();
  }
}
