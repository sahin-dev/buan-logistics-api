import {
  Controller, Get, Post, Put, Body, Param, UseGuards,
  Request, Query, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiBody, ApiConsumes, ApiQuery, ApiParam,
} from '@nestjs/swagger';
import { ShipmentService } from './shipment.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import { CreateT1ShipmentDto } from './dtos/create-t1-shipment.dto';
import { CreateT2T3ShipmentDto } from './dtos/create-t2t3-shipment.dto';
import { CreateCorporateShipmentDto } from './dtos/create-corporate-shipment.dto';
import { CreateContainerDto } from './dtos/create-container.dto';
import { CreateShipmentFromIntakeDto } from './dtos/create-shipment-from-intake.dto';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role, ShipmentStatus, ContainerStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiTags('Shipments & Parcels')
@Controller('shipments')
export class ShipmentController {
  constructor(
    private readonly shipmentService: ShipmentService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('t1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER, Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Entry a regular customer (T1) shipment (Hub Provider / Admin / Branch Staff only)' })
  @ApiBody({ type: CreateT1ShipmentDto })
  async createT1Shipment(@Body() dto: CreateT1ShipmentDto) {
    return this.shipmentService.createT1Shipment(dto);
  }

  @Post('t2t3')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create frequent/premium customer (T2/T3) shipment (Branch Admin / Branch Staff only)' })
  async createT2T3Shipment(@Body() dto: CreateT2T3ShipmentDto) {
    return this.shipmentService.createT2T3Shipment(dto);
  }

  @Post('corporate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH, Role.CORPORATE_PARTNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create corporate partner shipment (Corporate Partner / Admin / Branch Staff)' })
  async createCorporateShipment(@Body() dto: CreateCorporateShipmentDto) {
    return this.shipmentService.createCorporateShipment(dto);
  }

  @Post('from-intake/:intakeParcelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Branch creates a shipment from an intake parcel that arrived at branch',
  })
  async createShipmentFromIntake(
    @Param('intakeParcelId') intakeParcelId: string,
    @Body() dto: CreateShipmentFromIntakeDto,
    @Request() req: any,
  ) {
    return this.shipmentService.createFromIntakeParcel(
      intakeParcelId,
      dto,
      req.payload.userId,
    );
  }

  @Put(':id/pickup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER, Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Mark shipment as picked up from hub. Optionally attach photos (Hub Provider / Admin / Branch Staff only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional photos taken during pickup',
        },
      },
    },
  })
  async pickupFromHub(
    @Param('id') id: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let photoUrls: string[] = [];
    if (files && files.length > 0) {
      const result = await this.fileUploadService.uploadMultipleFiles(files);
      photoUrls = result.filePaths;
    }
    return this.shipmentService.pickupFromHub(id, photoUrls);
  }

  @Put(':id/arrive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark shipment as arrived at branch, calculate cost, generate invoice (Branch Admin / Staff only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cost: { type: 'number', example: 120.50, description: 'The final shipping cost calculated for the shipment' },
        branchId: { type: 'string', example: 'uuid-string-of-branch', description: 'The ID of the branch where the shipment arrived' }
      },
      required: ['cost', 'branchId']
    }
  })
  async arriveAtBranch(
    @Param('id') id: string,
    @Body('cost') cost: number,
    @Body('branchId') branchId: string,
  ) {
    return this.shipmentService.arriveAtBranch(id, cost, branchId);
  }

  @Put(':id/delivery-hub')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a delivery hub to a branch shipment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deliveryHubId: { type: 'string', example: 'delivery-hub-uuid' },
      },
      required: ['deliveryHubId'],
    },
  })
  async assignDeliveryHub(
    @Param('id') id: string,
    @Body('deliveryHubId') deliveryHubId: string,
    @Request() req: any,
  ) {
    return this.shipmentService.assignDeliveryHub(id, deliveryHubId, req.payload.userId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update shipment status manually with optional photos (Admin / Branch Staff only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(ShipmentStatus),
          description: 'The new status of the shipment',
        },
        notes: {
          type: 'string',
          example: 'Package sorted and ready for transit',
          description: 'Optional status notes or updates',
          nullable: true,
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional photos taken during this status update',
        },
      },
      required: ['status'],
    },
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ShipmentStatus,
    @Body('notes') notes?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let photoUrls: string[] = [];
    if (files && files.length > 0) {
      const result = await this.fileUploadService.uploadMultipleFiles(files);
      photoUrls = result.filePaths;
    }
    return this.shipmentService.updateStatus(id, status, notes, photoUrls);
  }

  @Get('hubs-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View which hub received how many parcels (Branch Admin / Staff only)' })
  async getHubParcelsSummary() {
    return this.shipmentService.getHubParcelsSummary();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all shipments for the logged-in customer (paginated, supports search and filters)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by tracking number, receiver name, or address' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by shipment status' })
  @ApiQuery({ name: 'shipmentType', required: false, type: String, description: 'Filter by shipment mode/type' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter createdAt on or after this date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter createdAt on or before this date' })
  async getMyShipments(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.shipmentService.getMyShipments(req.payload.userId, query);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all shipments for admin (paginated, supports search and filters)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by tracking number, receiver name, address, or sender email' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by shipment status' })
  @ApiQuery({ name: 'shipmentType', required: false, type: String, description: 'Filter by shipment mode/type' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter createdAt on or after this date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter createdAt on or before this date' })
  async getAllShipmentsForAdmin(@Query() query: PaginationQueryDto) {
    return this.shipmentService.getAllShipmentsForAdmin(query);
  }

  @Get('admin/branch/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'branchId', description: 'Branch ID (UUID)' })
  @ApiOperation({ summary: 'Get shipments for a branch and reset its new shipment counter (Admin only)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by tracking number, receiver name, address, or sender email' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by shipment status' })
  @ApiQuery({ name: 'shipmentType', required: false, type: String, description: 'Filter by shipment mode/type' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter createdAt on or after this date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter createdAt on or before this date' })
  async getShipmentsByBranchForAdmin(
    @Param('branchId') branchId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.shipmentService.getShipmentsByBranchIdForAdmin(branchId, query);
  }

  @Get('branch/incoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Branch dashboard: incoming shipments for logged-in branch' })
  async getBranchIncomingShipments(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.shipmentService.getBranchIncomingShipments(req.payload.userId, query);
  }

  @Get('branch/outgoing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Branch dashboard: outgoing shipments assigned to delivery hubs' })
  async getBranchOutgoingShipments(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.shipmentService.getBranchOutgoingShipments(req.payload.userId, query);
  }

  @Get('delivery-hub/incoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hub provider dashboard: incoming shipments assigned for delivery' })
  async getDeliveryHubIncomingShipments(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.shipmentService.getDeliveryHubIncomingShipments(req.payload.userId, query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Shipment ID (UUID)', example: 'shipment-uuid-123' })
  @ApiOperation({
    summary: 'Get a single shipment details (Admin only)',
    description: 'Retrieves complete details of a specific shipment including timeline, invoices, rewards, and container information. Requires admin privileges.'
  })
  @ApiResponse({
    status: 200,
    description: 'Shipment retrieved successfully',
    schema: {
      example: {
        id: 'shipment-uuid-123',
        shipment_number: 'BN-2026-123456',
        tracking_number: 'TRK-2026-789012',
        senderId: 'sender-uuid',
        receiverName: 'John Doe',
        receiverPhone: '1234567890',
        receiverAddress: '123 Main St, City, State 12345',
        weight: 2.5,
        current_status: 'IN_TRANSIT',
        shipmentType: 'AIR_CARGO',
        cost: 50.0,
        hubId: 'hub-uuid',
        branchId: 'branch-uuid',
        containerId: null,
        createdAt: '2026-07-02T10:30:00Z',
        updatedAt: '2026-07-02T11:45:00Z',
        timeline: [
          {
            id: 'timeline-uuid-1',
            shipmentId: 'shipment-uuid-123',
            status: 'AT_HUB',
            notes: 'Shipment received at hub',
            photoUrls: [],
            timestamp: '2026-07-02T10:30:00Z',
            createdAt: '2026-07-02T10:30:00Z'
          },
          {
            id: 'timeline-uuid-2',
            shipmentId: 'shipment-uuid-123',
            status: 'IN_TRANSIT',
            notes: 'Shipment picked up and in transit',
            photoUrls: ['https://example.com/photo1.jpg'],
            timestamp: '2026-07-02T11:00:00Z',
            createdAt: '2026-07-02T11:00:00Z'
          }
        ],
        invoices: [
          {
            id: 'invoice-uuid-1',
            shipmentId: 'shipment-uuid-123',
            amount: 50.0,
            remaining_amount: 0.0,
            status: 'PAID',
            createdAt: '2026-07-02T10:30:00Z',
            updatedAt: '2026-07-02T10:30:00Z'
          }
        ],
        rewards: [
          {
            id: 'reward-uuid-1',
            shipmentId: 'shipment-uuid-123',
            userId: 'user-uuid',
            type: 'MILESTONE',
            value: 500.0,
            redeemed: false,
            createdAt: '2026-07-02T10:30:00Z'
          }
        ],
        hub: {
          id: 'hub-uuid',
          name: 'Main Hub',
          location: 'City Center',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z'
        },
        branch: {
          id: 'branch-uuid',
          name: 'Downtown Branch',
          location: 'Downtown Area',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z'
        },
        sender: {
          id: 'sender-uuid',
          email: 'sender@example.com',
          profile: {
            id: 'profile-uuid',
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '9876543210',
            avatar: null,
            location: 'Original City',
            address: 'Sender Address'
          }
        },
        container: null
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getShipmentById(@Param('id') id: string) {
    return this.shipmentService.getShipmentById(id);
  }

  @Get('track/:trackingNumber')
  @Public()
  @ApiOperation({ summary: 'Track shipment by tracking number (Public)' })
  async trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.shipmentService.trackShipment(trackingNumber);
  }

  @Post('containers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new cargo/consolidated container (Admin/Branch staff only)' })
  async createContainer(@Body() dto: CreateContainerDto) {
    return this.shipmentService.createContainer(dto);
  }

  @Put('containers/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update container status and notify shipments (Admin/Branch staff only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { 
          type: 'string', 
          enum: Object.values(ContainerStatus), 
          description: 'The new status of the container' 
        }
      },
      required: ['status']
    }
  })
  async updateContainerStatus(
    @Param('id') id: string,
    @Body('status') status: ContainerStatus,
  ) {
    return this.shipmentService.updateContainerStatus(id, status);
  }

  @Put('containers/:id/assign/:shipmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a shipment to a container (Admin/Branch staff only)' })
  async assignShipmentToContainer(
    @Param('id') id: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shipmentService.assignShipmentToContainer(shipmentId, id);
  }

  @Get('containers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get container details (Admin/Branch staff only)' })
  async getContainer(@Param('id') id: string) {
    return this.shipmentService.getContainerById(id);
  }
}
