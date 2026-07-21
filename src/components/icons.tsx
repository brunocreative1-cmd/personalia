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
