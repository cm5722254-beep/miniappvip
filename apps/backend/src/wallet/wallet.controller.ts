import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateDepositDto } from './dto/deposit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get current wallet balance' })
  getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.walletService.getTransactions(userId, +page, +limit);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Create a deposit request' })
  createDeposit(@CurrentUser('id') userId: string, @Body() dto: CreateDepositDto) {
    return this.walletService.createDeposit(userId, dto);
  }

  @Get('deposit/:id')
  @ApiOperation({ summary: 'Get deposit status' })
  getDeposit(@CurrentUser('id') userId: string, @Param('id') depositId: string) {
    return this.walletService.getDeposit(userId, depositId);
  }

  @Post('deposit/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending deposit' })
  cancelDeposit(@CurrentUser('id') userId: string, @Param('id') depositId: string) {
    return this.walletService.cancelDeposit(userId, depositId);
  }
}
