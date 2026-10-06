import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManualPaymentProvider } from './providers/manual.provider';
import { IPaymentProvider } from './interfaces/payment-provider.interface';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly provider: IPaymentProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly manualProvider: ManualPaymentProvider,
  ) {
    const providerName = configService.get<string>('PAYMENT_PROVIDER', 'manual');
    this.provider = this.selectProvider(providerName);
    this.logger.log(`Payment provider: ${providerName}`);
  }

  private selectProvider(name: string): IPaymentProvider {
    switch (name) {
      case 'manual':
        return this.manualProvider;
      default:
        this.logger.warn(`Unknown payment provider "${name}", falling back to manual`);
        return this.manualProvider;
    }
  }

  get activeProvider(): IPaymentProvider {
    return this.provider;
  }
}
