interface TelegramErrorScreenProps {
  message: string;
}

export function TelegramErrorScreen({ message }: TelegramErrorScreenProps) {
  return (
    <div className="fixed inset-0 bg-cinema-bg flex flex-col items-center justify-center z-50 px-8">
      <div className="text-5xl mb-6">⚠️</div>
      <h1 className="text-white font-bold text-xl mb-3 text-center">មានបញ្ហា</h1>
      <p className="text-gray-400 text-sm text-center leading-relaxed mb-8">{message}</p>
      <div className="bg-cinema-panel border border-gold/20 rounded-2xl p-6 w-full text-center">
        <p className="text-gold text-sm font-semibold mb-2">👑 អាធិរាជរឿង</p>
        <p className="text-gray-400 text-xs">
          សូមបើក App នេះតាម Telegram Mini App
        </p>
      </div>
    </div>
  );
}
