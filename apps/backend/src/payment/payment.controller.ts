import { Controller, Post, Param, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Payment provider webhook handler' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
    @Headers('x-webhook-signature') signature: string,
  ) {
    this.logger.log(`Webhook received from provider: ${provider}`);
    return this.paymentService.activeProvider.handleWebhook(payload, signature);
  }
}
