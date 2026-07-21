/** Busca por nome (case-insensitive) ou WhatsApp (dígitos normalizados). */
export function correspondeBusca(
  termo: string,
  nome: string | null,
  whatsapp: string | null
): boolean {
  const q = termo.trim().toLowerCase()
  if (!q) return true
  if ((nome ?? '').toLowerCase().includes(q)) return true
  const digitos = q.replace(/\D/g, '')
  if (!digitos) return false
  return (whatsapp ?? '').replace(/\D/g, '').includes(digitos)
}
