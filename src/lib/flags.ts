/**
 * Flags de interface. UI_MODO_TESTE (VITE_PLAYER_VISUAL, dev-only por
 * construção): em build de produção, import.meta.env.DEV vira false e todo
 * comportamento atrás dela fica inerte — produção permanece inalterada até
 * ordem de promoção.
 *
 * Gateia as correções 008 no front: métricas reais filtram simulado,
 * selo "Demonstrativo" (aluno) e badge na ficha (coach), botão "Simular
 * treino", alerta de dor marcado e o aviso dev de fonte fallback no player.
 */
export const UI_MODO_TESTE =
  import.meta.env.DEV && import.meta.env.VITE_PLAYER_VISUAL === '1'

/**
 * DESIGN_PREVIEW (dev-only): bypass de autenticação para trabalho de
 * layout/design system sem Supabase configurado. Injeta uma sessão fake com o
 * papel indicado em VITE_DESIGN_PREVIEW ('coach' | 'aluno'), permitindo abrir
 * as áreas internas direto. Gateado por import.meta.env.DEV — em build de
 * produção fica sempre nulo, sem qualquer efeito. O valor vem do .env, que é
 * gitignored, então o bypass nunca entra no repositório.
 */
export const DESIGN_PREVIEW_ROLE: 'coach' | 'aluno' | null =
  import.meta.env.DEV &&
  (import.meta.env.VITE_DESIGN_PREVIEW === 'coach' ||
    import.meta.env.VITE_DESIGN_PREVIEW === 'aluno')
    ? import.meta.env.VITE_DESIGN_PREVIEW
    : null
