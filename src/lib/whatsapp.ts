/**
 * Normaliza um WhatsApp brasileiro para "(DD) XXXXX-XXXX".
 * Aceita com/sem +55, com/sem máscara. Retorna null se inválido
 * (DDD 11–99 + 8 ou 9 dígitos).
 */
export function normalizarWhatsapp(input: string): string | null {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  if (d.length < 10 || d.length > 11) return null
  const ddd = d.slice(0, 2)
  if (!/^[1-9][0-9]$/.test(ddd)) return null
  const corpo = d.slice(2)
  const corte = corpo.length === 9 ? 5 : 4
  return `(${ddd}) ${corpo.slice(0, corte)}-${corpo.slice(corte)}`
}

/** Só dígitos, com 55 na frente — formato do link wa.me. */
export function whatsappParaLink(whatsapp: string): string {
  let d = whatsapp.replace(/\D/g, '')
  if (!d.startsWith('55')) d = `55${d}`
  return d
}
