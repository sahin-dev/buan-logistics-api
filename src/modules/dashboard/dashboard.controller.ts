import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get overview statistics for the admin dashboard home page' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Year to filter user & earning growth charts (defaults to current year)' })
  async getDashboardStats(@Query('year') year?: string) {
    const filterYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.dashboardService.getAdminDashboardStats(filterYear);
  }
}
