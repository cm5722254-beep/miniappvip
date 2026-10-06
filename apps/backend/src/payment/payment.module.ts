import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ManualPaymentProvider } from './providers/manual.provider';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, ManualPaymentProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
