import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ShipmentService } from './shipment.service';
import { CreateT1ShipmentDto } from './dtos/create-t1-shipment.dto';
import { CreateT2T3ShipmentDto } from './dtos/create-t2t3-shipment.dto';
import { CreateCorporateShipmentDto } from './dtos/create-corporate-shipment.dto';
import { CreateContainerDto } from './dtos/create-container.dto';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role, ShipmentStatus, ContainerStatus } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiTags('Shipments & Parcels')
@Controller('shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post('t1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER, Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Entry a regular customer (T1) shipment (Hub Provider / Admin / Branch Staff only)' })
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

  @Put(':id/pickup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HUB_PROIVDER, Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark shipment as picked up from hub (Hub Provider / Admin / Branch Staff only)' })
  async pickupFromHub(@Param('id') id: string) {
    return this.shipmentService.pickupFromHub(id);
  }

  @Put(':id/arrive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark shipment as arrived at branch, calculate cost, generate invoice (Branch Admin / Staff only)' })
  async arriveAtBranch(
    @Param('id') id: string,
    @Body('cost') cost: number,
    @Body('branchId') branchId: string,
  ) {
    return this.shipmentService.arriveAtBranch(id, cost, branchId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shipment status manually (Admin / Branch Staff only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ShipmentStatus,
    @Body('notes') notes?: string,
  ) {
    return this.shipmentService.updateStatus(id, status, notes);
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
  @ApiOperation({ summary: 'Get all shipments for the logged-in customer (paginated, supports ?page=1&limit=10)' })
  async getMyShipments(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.shipmentService.getMyShipments(req.payload.userId, query);
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
