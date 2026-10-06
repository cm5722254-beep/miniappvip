import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { AdminService } from '../admin.service';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { BalanceAdjustmentDto } from '../dto/balance-adjustment.dto';
import { Request } from 'express';

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminUsersService.findAll(+page, +limit, search, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail' })
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    const result = await this.adminUsersService.activate(id);
    await this.adminService.createAuditLog({ adminId: req.user.id, action: 'ACTIVATE_USER', targetType: 'User', targetId: id });
    return result;
  }

  @Post(':id/suspend')
  async suspend(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    const result = await this.adminUsersService.suspend(id);
    await this.adminService.createAuditLog({ adminId: req.user.id, action: 'SUSPEND_USER', targetType: 'User', targetId: id });
    return result;
  }

  @Post(':id/ban')
  async ban(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    const result = await this.adminUsersService.ban(id);
    await this.adminService.createAuditLog({ adminId: req.user.id, action: 'BAN_USER', targetType: 'User', targetId: id });
    return result;
  }

  @Post(':id/balance')
  @ApiOperation({ summary: 'Adjust user balance' })
  async adjustBalance(
    @Param('id') id: string,
    @Body() dto: BalanceAdjustmentDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const result = await this.adminUsersService.adjustBalance(id, dto);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: `BALANCE_ADJUST_${dto.type}`,
      targetType: 'User',
      targetId: id,
      newValue: { amount: dto.amount, reason: dto.reason, type: dto.type },
    });
    return result;
  }
}
