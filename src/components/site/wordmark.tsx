export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display font-bold tracking-tight text-foreground ${className}`}
      style={{ letterSpacing: "-0.02em" }}
    >
      Tele<span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">K</span>amera
    </span>
  );
}
