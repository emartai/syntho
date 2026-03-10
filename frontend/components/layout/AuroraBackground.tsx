export function AuroraBackground() {
  return (
    <div 
      aria-hidden 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 0, 
        pointerEvents: 'none', 
        overflow: 'hidden' 
      }}
    >
      <div 
        className="animate-aurora-1" 
        style={{ 
          position: 'absolute', 
          top: '-20%', 
          left: '20%', 
          width: '55%', 
          height: '55%', 
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 70%)', 
          borderRadius: '50%', 
          filter: 'blur(40px)' 
        }} 
      />
      <div 
        className="animate-aurora-2" 
        style={{ 
          position: 'absolute', 
          top: '15%', 
          right: '-15%', 
          width: '50%', 
          height: '55%', 
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.14) 0%, transparent 70%)', 
          borderRadius: '50%', 
          filter: 'blur(50px)' 
        }} 
      />
      <div 
        className="animate-aurora-3" 
        style={{ 
          position: 'absolute', 
          bottom: '-20%', 
          left: '-10%', 
          width: '45%', 
          height: '50%', 
          background: 'radial-gradient(ellipse, rgba(167,139,250,0.10) 0%, transparent 70%)', 
          borderRadius: '50%', 
          filter: 'blur(60px)' 
        }} 
      />
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, 
          opacity: 0.025, 
          mixBlendMode: 'overlay' as const 
        }} 
      />
    </div>
  );
}
