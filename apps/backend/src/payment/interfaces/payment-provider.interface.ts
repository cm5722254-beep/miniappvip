export interface DepositResult {
  depositId: string;
  status: 'pending' | 'completed' | 'failed';
  instructions?: string;
  redirectUrl?: string;
  expiresAt?: Date;
}

export interface VerifyResult {
  verified: boolean;
  status: 'completed' | 'pending' | 'failed';
  transactionId?: string;
  message?: string;
}

export interface WebhookResult {
  depositId: string;
  status: 'completed' | 'failed';
  amount?: number;
  transactionId?: string;
}

export interface RefundResult {
  success: boolean;
  transactionId?: string;
  message?: string;
}

export interface IPaymentProvider {
  createDeposit(params: {
    userId: string;
    amount: number;
    currency: string;
    depositId: string;
    metadata?: Record<string, string>;
  }): Promise<DepositResult>;

  verifyPayment(depositId: string, providerData?: Record<string, unknown>): Promise<VerifyResult>;

  handleWebhook(payload: Record<string, unknown>, signature: string): Promise<WebhookResult>;

  refund(transactionId: string, amount: number): Promise<RefundResult>;
}
