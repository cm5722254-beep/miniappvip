import { Injectable } from '@nestjs/common';
import {
  IPaymentProvider,
  DepositResult,
  VerifyResult,
  WebhookResult,
  RefundResult,
} from '../interfaces/payment-provider.interface';

/**
 * Manual Payment Provider
 * Used for bank transfer / QR code / cash payments
 * Admin manually approves/rejects deposits via admin panel
 */
@Injectable()
export class ManualPaymentProvider implements IPaymentProvider {
  async createDeposit(params: {
    userId: string;
    amount: number;
    currency: string;
    depositId: string;
  }): Promise<DepositResult> {
    // Manual provider just creates a pending deposit
    // Admin will approve/reject through admin panel
    return {
      depositId: params.depositId,
      status: 'pending',
      instructions:
        'សូមផ្ទេរប្រាក់ទៅគណនីដែលបានកំណត់ ហើយបញ្ចូករូបភាពបញ្ជាក់ការទូទាត់',
    };
  }

  async verifyPayment(depositId: string): Promise<VerifyResult> {
    // Manual verification is done by admin — this is a no-op
    return {
      verified: false,
      status: 'pending',
      message: 'Awaiting admin verification',
    };
  }

  async handleWebhook(
    payload: Record<string, unknown>,
    signature: string,
  ): Promise<WebhookResult> {
    // Manual provider has no webhook
    throw new Error('Manual provider does not support webhooks');
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    // Manual refund — admin handles this directly
    return {
      success: true,
      transactionId,
      message: 'Refund must be processed manually',
    };
  }
}
