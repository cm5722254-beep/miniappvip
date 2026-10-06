import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminDepositsService } from './admin-deposits.service';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { AdminService } from '../admin.service';
import { IsOptional, IsString } from 'class-validator';
import { Request } from 'express';

class RejectDepositDto {
  @IsString()
  reason: string;
}

class ApproveDepositDto {
  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('Admin - Deposits')
@Controller('admin/deposits')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth()
export class AdminDepositsController {
  constructor(
    private readonly adminDepositsService: AdminDepositsService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all deposits' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.adminDepositsService.findAll(+page, +limit, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deposit detail' })
  findOne(@Param('id') id: string) {
    return this.adminDepositsService.findOne(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve deposit and credit wallet' })
  async approve(
    @Param('id') depositId: string,
    @Body() dto: ApproveDepositDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const result = await this.adminDepositsService.approve(depositId, req.user.id, dto.note);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'APPROVE_DEPOSIT',
      targetType: 'Deposit',
      targetId: depositId,
      newValue: { status: 'COMPLETED', note: dto.note },
    });
    return result;
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject deposit' })
  async reject(
    @Param('id') depositId: string,
    @Body() dto: RejectDepositDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const result = await this.adminDepositsService.reject(depositId, req.user.id, dto.reason);
    await this.adminService.createAuditLog({
      adminId: req.user.id,
      action: 'REJECT_DEPOSIT',
      targetType: 'Deposit',
      targetId: depositId,
      newValue: { status: 'FAILED', reason: dto.reason },
    });
    return result;
  }
}
