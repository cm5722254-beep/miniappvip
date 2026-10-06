import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/wallet.service';
import { useTelegram } from '@/hooks/useTelegram';
import { clsx } from 'clsx';
import type { Deposit } from '@/types';

const PRESET_AMOUNTS = [1, 2, 5, 10, 20, 50];
const PAYMENT_METHODS = [
  { id: 'MANUAL_BANK_TRANSFER', label: 'ផ្ទេរប្រាក់ធនាគារ', icon: '🏦' },
  { id: 'MANUAL_KHQR', label: 'KHQR', icon: '📱' },
  { id: 'MANUAL_ABABANK', label: 'ABA Bank', icon: '💳' },
];

type Step = 'form' | 'instructions';

export function DepositPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].id);
  const [step, setStep] = useState<Step>('form');
  const [depositId, setDepositId] = useState<string | null>(null);

  // Poll the created deposit for status
  const { data: depositData } = useQuery({
    queryKey: ['deposit', depositId],
    queryFn: () => walletService.getDeposit(depositId!).then((r) => r.data),
    enabled: !!depositId,
    refetchInterval: 5000, // poll every 5s for status update
  });

  const depositMutation = useMutation({
    mutationFn: (data: { amount: number; paymentMethod: string }) =>
      walletService.createDeposit(data),
    onSuccess: (res) => {
      haptic.success();
      setDepositId(res.data.depositId);
      setStep('instructions');
    },
    onError: () => {
      haptic.error();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => walletService.cancelDeposit(depositId!),
    onSuccess: () => {
      haptic.selection();
      setStep('form');
      setDepositId(null);
    },
  });

  const finalAmount = customAmount ? parseFloat(customAmount) : parseFloat(amount);

  const handleSubmit = () => {
    if (!finalAmount || finalAmount < 1) return;
    haptic.medium();
    depositMutation.mutate({ amount: finalAmount, paymentMethod });
  };

  const handleAmountSelect = (val: number) => {
    haptic.light();
    setAmount(String(val));
    setCustomAmount('');
  };

  if (step === 'instructions' && (depositData || depositMutation.data)) {
    const deposit: Deposit = depositData ?? depositMutation.data!.data;
    return (
      <InstructionsView
        deposit={deposit}
        onCancel={() => cancelMutation.mutate()}
        isCancelling={cancelMutation.isPending}
        onDone={() => navigate('/wallet')}
      />
    );
  }

  return (
    <div className="bg-cinema-bg min-h-screen animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-cinema-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-cinema-panel border border-cinema-border flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="text-white">←</span>
        </button>
        <h1 className="text-white font-bold text-lg">➕ ដាក់ប្រាក់</h1>
      </header>

      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* Amount preset */}
        <div>
          <p className="text-gray-400 text-xs font-medium mb-3">ជ្រើសចំនួនទឹកប្រាក់</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                onClick={() => handleAmountSelect(val)}
                className={clsx(
                  'py-3 rounded-xl font-bold text-sm border transition-all duration-150 active:scale-95',
                  amount === String(val) && !customAmount
                    ? 'bg-gold text-black border-gold shadow-md'
                    : 'bg-cinema-panel text-white border-cinema-border',
                )}
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div>
          <p className="text-gray-400 text-xs font-medium mb-2">ឬបញ្ចូលចំនួនផ្ទាល់ខ្លួន</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setAmount('');
              }}
              className="w-full bg-cinema-panel border border-cinema-border rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="text-gray-400 text-xs font-medium mb-3">វិធីបង់ប្រាក់</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  haptic.light();
                  setPaymentMethod(method.id);
                }}
                className={clsx(
                  'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 active:scale-[0.98]',
                  paymentMethod === method.id
                    ? 'bg-gold/10 border-gold/50 text-white'
                    : 'bg-cinema-panel border-cinema-border text-gray-300',
                )}
              >
                <span className="text-xl">{method.icon}</span>
                <span className="flex-1 text-left text-sm font-medium">{method.label}</span>
                <span
                  className={clsx(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0',
                    paymentMethod === method.id
                      ? 'bg-gold border-gold'
                      : 'border-gray-600',
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {finalAmount > 0 && !isNaN(finalAmount) && (
          <div className="bg-cinema-panel rounded-xl border border-cinema-border p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">ចំនួនដាក់ប្រាក់</span>
              <span className="text-white font-semibold">${finalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">វិធីបង់</span>
              <span className="text-white font-semibold">
                {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {depositMutation.isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-red-400 text-sm text-center">
              {(depositMutation.error as Error)?.message || 'ការដាក់ប្រាក់បានបរាជ័យ'}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={
            depositMutation.isPending ||
            !finalAmount ||
            isNaN(finalAmount) ||
            finalAmount < 1
          }
          className={clsx(
            'w-full bg-gold text-black font-bold rounded-xl py-4 text-base active:scale-95 transition-transform',
            (depositMutation.isPending || !finalAmount || isNaN(finalAmount) || finalAmount < 1) &&
              'opacity-50 cursor-not-allowed',
          )}
        >
          {depositMutation.isPending ? 'កំពុងដំណើរការ...' : '✅ បញ្ជាក់ការដាក់ប្រាក់'}
        </button>
      </div>
    </div>
  );
}

/* ─── Instructions View ─── */

function InstructionsView({
  deposit,
  onCancel,
  isCancelling,
  onDone,
}: {
  deposit: Deposit;
  onCancel: () => void;
  isCancelling: boolean;
  onDone: () => void;
}) {
  const config = deposit.config ?? {};
  const isPending = deposit.status === 'PENDING';
  const isCompleted = deposit.status === 'COMPLETED';
  const isFailed = ['FAILED', 'CANCELLED'].includes(deposit.status);

  return (
    <div className="bg-cinema-bg min-h-screen animate-fade-in">
      <header className="sticky top-0 z-40 glass-panel border-b border-cinema-border px-4 py-3">
        <h1 className="text-white font-bold text-lg">📋 ការណែនាំបង់ប្រាក់</h1>
      </header>

      <div className="px-4 pt-4 pb-8 space-y-4">
        {/* Status banner */}
        <div
          className={clsx(
            'rounded-2xl p-4 border',
            isCompleted
              ? 'bg-green-500/10 border-green-500/30'
              : isFailed
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-gold/10 border-gold/30',
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {isCompleted ? '✅' : isFailed ? '❌' : '⏳'}
            </span>
            <div>
              <p className="text-white font-bold text-sm">
                {isCompleted
                  ? 'ការដាក់ប្រាក់ជោគជ័យ!'
                  : isFailed
                  ? 'ការដាក់ប្រាក់មិនបានជោគជ័យ'
                  : 'រង់ចាំការបញ្ជាក់'}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {isCompleted
                  ? 'ប្រាក់ត្រូវបានបន្ថែមទៅគណនីរបស់អ្នករួចហើយ'
                  : isFailed
                  ? 'ការដាក់ប្រាក់ត្រូវបានបដិសេធ'
                  : 'Admin នឹងបញ្ជាក់ក្នុងរយៈពេល 15-30 នាទី'}
              </p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-cinema-panel rounded-2xl border border-cinema-border p-4">
          <p className="text-gray-400 text-xs mb-1">ចំនួនដាក់ប្រាក់</p>
          <p className="text-gold font-bold text-3xl">
            ${parseFloat(String(deposit.amount)).toFixed(2)}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            លេខយោង: #{deposit.depositId?.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Payment instructions */}
        {isPending && (
          <>
            {deposit.instructions && (
              <div className="bg-cinema-panel rounded-2xl border border-cinema-border p-4">
                <p className="text-gray-400 text-xs font-medium mb-2">📌 ការណែនាំ</p>
                <p className="text-white text-sm leading-relaxed whitespace-pre-line">
                  {deposit.instructions}
                </p>
              </div>
            )}

            {/* Bank details */}
            {(config.bankName || config.accountNumber) && (
              <div className="bg-cinema-panel rounded-2xl border border-cinema-border p-4 space-y-3">
                <p className="text-gray-400 text-xs font-medium">🏦 ព័ត៌មានធនាគារ</p>

                {config.bankName && (
                  <InfoRow label="ធនាគារ" value={config.bankName} />
                )}
                {config.accountNumber && (
                  <InfoRow label="លេខគណនី" value={config.accountNumber} copyable />
                )}
                {config.accountName && (
                  <InfoRow label="ឈ្មោះ" value={config.accountName} />
                )}
              </div>
            )}

            {/* QR Code */}
            {config.qrImageUrl && (
              <div className="bg-cinema-panel rounded-2xl border border-cinema-border p-4 flex flex-col items-center">
                <p className="text-gray-400 text-xs font-medium mb-3">📱 QR Code</p>
                <img
                  src={config.qrImageUrl}
                  alt="QR Code"
                  className="w-48 h-48 rounded-xl object-contain bg-white p-2"
                />
              </div>
            )}

            {/* Expiry */}
            {deposit.expiresAt && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                <p className="text-orange-400 text-xs text-center">
                  ⏰ ផុតកំណត់ {new Date(deposit.expiresAt).toLocaleTimeString('km-KH')}
                </p>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {isCompleted ? (
            <button
              onClick={onDone}
              className="w-full bg-gold text-black font-bold rounded-xl py-4 text-base active:scale-95 transition-transform"
            >
              ✅ ត្រលប់ទៅកាបូប
            </button>
          ) : isFailed ? (
            <button
              onClick={onDone}
              className="w-full bg-cinema-panel border border-cinema-border text-white font-bold rounded-xl py-4 text-base active:scale-95 transition-transform"
            >
              ← ត្រលប់ក្រោយ
            </button>
          ) : (
            <>
              <button
                onClick={onDone}
                className="w-full bg-gold text-black font-bold rounded-xl py-4 text-base active:scale-95 transition-transform"
              >
                ✅ យល់ព្រម — រង់ចាំបញ្ជាក់
              </button>
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="w-full bg-cinema-panel border border-red-500/30 text-red-400 font-semibold rounded-xl py-3 text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                {isCancelling ? 'កំពុងលប់...' : '❌ លប់ការដាក់ប្រាក់'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-semibold">{value}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-gold text-xs bg-gold/10 border border-gold/30 rounded-lg px-2 py-0.5 active:scale-95 transition-transform"
          >
            ចម្លង
          </button>
        )}
      </div>
    </div>
  );
}
