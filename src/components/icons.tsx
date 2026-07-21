/**
 * Ícones da interface — SVGs de traço (stroke) que herdam a cor via
 * `currentColor` e escalam com o tamanho de fonte (width/height = 1em),
 * podendo ser sobrescritos por utilitários de tamanho (ex.: h-6 w-6).
 * Substituem os emojis antes usados na UI, para um visual consistente.
 */
import type { ReactNode } from 'react'

function Icon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Sol — aba "Hoje" (visão do dia). */
export function IconSun({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Icon>
  )
}

/** Halter — aba "Treino". */
export function IconDumbbell({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
    </Icon>
  )
}

/** Linha ascendente — aba "Progresso". */
export function IconTrendingUp({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Icon>
  )
}

/** Balão de conversa — CTA de WhatsApp. */
export function IconChat({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Icon>
  )
}

/** Lua — mensagem de dia de descanso/recuperação. */
export function IconMoon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  )
}

/** Círculo com check — mensagens de sucesso/conclusão. */
export function IconCheckCircle({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Icon>
  )
}

/** Triângulo de atenção — alertas e avisos. */
export function IconAlertTriangle({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  )
}

/** Check simples — série concluída / finalizar. */
export function IconCheck({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  )
}

/** Sino — avisos/pendências do aluno. */
export function IconBell({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Icon>
  )
}

/** Seta para a direita — indica que o cartão abre outra tela. */
export function IconChevronRight({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <polyline points="9 18 15 12 9 6" />
    </Icon>
  )
}

/** Chama — intensidade/esforço. */
export function IconFlame({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Icon>
  )
}

/** Relógio — duração das sessões. */
export function IconClock({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </Icon>
  )
}

/** Pulso de atividade — resumo de treinos. */
export function IconActivity({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Icon>
  )
}

/** Silhueta — aba de perfil. */
export function IconUser({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  )
}

/** Casa — aba inicial. */
export function IconHome({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <polyline points="9 21 9 13 15 13 15 21" />
    </Icon>
  )
}

/** Calendário — datas de check-in. */
export function IconCalendar({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2.5" x2="8" y2="6" />
      <line x1="16" y1="2.5" x2="16" y2="6" />
    </Icon>
  )
}

/** Logo do WhatsApp (glifo preenchido). Herda a cor via currentColor. */
export function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.96L2 22l4.25-1.11a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.52.66.67-2.46-.2-.31a8.16 8.16 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23zm-4.6 4.4c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.71 2.61 4.15 3.56 2.02.79 2.43.63 2.87.59.44-.04 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.32-.74-1.8-.2-.47-.4-.41-.54-.42z" />
    </svg>
  )
}
