export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: '#06b6d4', borderRightColor: '#a78bfa' }}
          />
        </div>
        <p className="text-sm text-[rgba(241,240,255,0.45)]" style={{ fontFamily: 'Satoshi, sans-serif' }}>
          Loading...
        </p>
      </div>
    </div>
  );
}
