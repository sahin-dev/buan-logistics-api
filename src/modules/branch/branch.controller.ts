import { Controller, Get, Post, Body, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dtos/create-branch.dto';
import { CreateHubDto } from './dtos/create-hub.dto';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiTags('Branches & Hubs')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new branch (Admin only)' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.branchService.createBranch(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all branches (paginated, supports ?page=1&limit=10&search=keyword)' })
  async getAllBranches(@Query() query: PaginationQueryDto) {
    return this.branchService.getAllBranches(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch by ID' })
  async getBranchById(@Param('id') id: string) {
    return this.branchService.getBranchById(id);
  }

  @Post('hubs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new hub with optional commission rate (Admin only)' })
  async createHub(@Body() dto: CreateHubDto) {
    return this.branchService.createHub(dto);
  }

  @Get('hubs/all')
  @ApiOperation({ summary: 'Get all hubs (paginated, supports ?page=1&limit=10&search=keyword)' })
  async getAllHubs(@Query() query: PaginationQueryDto) {
    return this.branchService.getAllHubs(query);
  }

  @Get('hubs/:id')
  @ApiOperation({ summary: 'Get hub by ID' })
  async getHubById(@Param('id') id: string) {
    return this.branchService.getHubById(id);
  }

  @Put('hubs/:id/assign-provider/:providerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a user as a hub provider for a hub (Admin only)' })
  async assignHubProvider(
    @Param('id') id: string,
    @Param('providerId') providerId: string,
  ) {
    return this.branchService.assignHubProvider(id, providerId);
  }

  // ─── Hub Commission Endpoints ──────────────────────────────────────────────

  @Get('hubs/:id/commissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all commissions for a hub (paginated) — supports ?page=1&limit=10' })
  async getHubCommissions(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.branchService.getHubCommissions(id, query);
  }

  @Put('hubs/commissions/:commissionId/pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a hub commission as paid (Admin only)' })
  async payHubCommission(@Param('commissionId') commissionId: string) {
    return this.branchService.payHubCommission(commissionId);
  }
}
