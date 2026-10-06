interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'កំពុងផ្ទុក...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-cinema-bg flex flex-col items-center justify-center z-50">
      {/* Crown logo */}
      <div className="mb-6 animate-pulse">
        <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center">
          <span className="text-4xl">👑</span>
        </div>
      </div>

      {/* App name */}
      <h1 className="text-gold font-bold text-2xl mb-1 tracking-wide">
        អាធិរាជរឿង
      </h1>
      <p className="text-gray-500 text-xs mb-8">រឿងល្អៗ នៅជិតអ្នកជានិច្ច</p>

      {/* Spinner */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      {message && (
        <p className="text-gray-400 text-xs mt-4">{message}</p>
      )}
    </div>
  );
}
