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
 * Build de demonstração (Vercel): habilita o DESIGN_PREVIEW também num build
 * de produção. Só liga quando VITE_DEMO === '1' é passado explicitamente no
 * ambiente do build. Um build de produção REAL (sem essa variável) mantém
 * tudo desligado — o bypass nunca vaza para o app de verdade.
 */
const DEMO_BUILD = import.meta.env.VITE_DEMO === '1'

/**
 * DESIGN_PREVIEW: bypass de autenticação para trabalhar o layout/design
 * system sem Supabase configurado. Injeta uma sessão fake com o papel indicado
 * em VITE_DESIGN_PREVIEW ('coach' | 'aluno'), abrindo as áreas internas direto.
 *
 * Ativo em DEV (trabalho local) OU num build de demonstração (VITE_DEMO=1).
 * Em produção real fica sempre nulo, sem qualquer efeito.
 */
export const DESIGN_PREVIEW_ROLE: 'coach' | 'aluno' | null =
  (import.meta.env.DEV || DEMO_BUILD) &&
  (import.meta.env.VITE_DESIGN_PREVIEW === 'coach' ||
    import.meta.env.VITE_DESIGN_PREVIEW === 'aluno')
    ? import.meta.env.VITE_DESIGN_PREVIEW
    : null
