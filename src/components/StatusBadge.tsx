const STYLES: Record<string, string> = {
  novo: 'bg-terracotta/10 text-terracotta',
  ativo: 'bg-sage/15 text-sage',
  pausado: 'bg-ink/10 text-ink/60',
  concluido: 'bg-ink text-cream',
}

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-ink/10 text-ink/60'
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  )
}
