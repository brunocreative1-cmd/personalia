export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="font-display text-lg text-ink/50">Carregando…</p>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="max-w-sm text-ink/70">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-terracotta px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Tentar novamente
      </button>
    </div>
  )
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-lg text-ink/60">{message}</p>
    </div>
  )
}
