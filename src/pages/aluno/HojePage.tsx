import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMeuRegistro } from '../../lib/api'
import type { Aluno } from '../../lib/api'
import { fetchMinhaAnamnese } from '../../lib/anamnese'
import type { Anamnese } from '../../lib/anamnese'
import { fetchMinhasExecucoes } from '../../lib/execucoes'
import type { ExecucaoComSeries } from '../../lib/execucoes'
import { fetchMeuPrograma } from '../../lib/programas'
import type { Programa, Sessao } from '../../lib/programas'
import { semanaAtual, treinoDoDia } from '../../lib/treino'
import { resumoFrequencia } from '../../lib/historico'
import { whatsappParaLink } from '../../lib/whatsapp'
import { UI_MODO_TESTE } from '../../lib/flags'
import { usePgQuery } from '../../hooks/usePgQuery'
import { ErrorBlock } from '../../components/DataState'
import {
  IconActivity,
  IconBell,
  IconCalendar,
  IconChat,
  IconChevronRight,
  IconClock,
  IconFlame,
  IconMoon,
  IconWhatsApp,
} from '../../components/icons'
import { formatDateBR, hojeSaoPaulo, parseDateOnly, progressoPrograma } from '../../lib/dates'

const CARD = 'rounded-2xl bg-carbon p-5'
const ROTULO = 'text-[11px] font-medium uppercase tracking-wider text-white/40'

/** Chave 'seg'|'ter'|… de uma data, alinhada com dias_sugeridos das sessões. */
const DIAS_KEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const
const DIAS_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
/** Inicial do dia indexada por getDay() (0 = domingo). */
const DIAS_INICIAL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** Os 7 dias da semana corrente (segunda → domingo) no fuso de São Paulo. */
function diasDaSemana(): Date[] {
  const hoje = hojeSaoPaulo()
  const paraSegunda = hoje.getDay() === 0 ? -6 : 1 - hoje.getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + paraSegunda + i)
    return d
  })
}

/**
 * Últimos 7 dias terminando hoje. O gráfico usa esta janela (e não a semana
 * do calendário) para "Atividade recente" nunca aparecer vazia só porque a
 * semana acabou de começar.
 */
function ultimos7Dias(): Date[] {
  const hoje = hojeSaoPaulo()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() - 6 + i)
    return d
  })
}

const mesmaData = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// ————— peças visuais —————

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 pt-8">
      <div className="h-12 w-48 rounded-xl bg-carbon" />
      <div className="h-16 rounded-2xl bg-carbon" />
      <div className="h-40 rounded-2xl bg-carbon" />
      <div className="h-28 rounded-2xl bg-carbon" />
    </div>
  )
}

function SemVinculo() {
  return (
    <div className="pt-24 text-center">
      <h1 className="font-display text-2xl text-white">Quase lá!</h1>
      <p className="mx-auto mt-3 max-w-xs text-sm text-white/50">
        Seu cadastro ainda não foi vinculado pelo seu coach. Assim que ele liberar, seu programa
        de 30 dias aparece aqui.
      </p>
    </div>
  )
}

/** Anel de progresso (equivale aos anéis de Calories/Durations da referência). */
function Anel({ pct, cor }: { pct: number; cor: string }) {
  const raio = 26
  const volta = 2 * Math.PI * raio
  const preenchido = Math.min(Math.max(pct, 0), 1)
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90" aria-hidden="true">
      <circle cx="32" cy="32" r={raio} fill="none" strokeWidth="6" className="stroke-steel" />
      <circle
        cx="32"
        cy="32"
        r={raio}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        stroke={cor}
        strokeDasharray={volta}
        strokeDashoffset={volta * (1 - preenchido)}
      />
    </svg>
  )
}

function Header({ nome, pendencia }: { nome: string; pendencia: boolean }) {
  const iniciais = nome.slice(0, 1).toUpperCase()
  return (
    <div className="flex items-center gap-3 pt-6">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-flame font-display text-lg text-white">
        {iniciais}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg text-white">Olá, {nome}</p>
        <p className="text-sm text-white/50">Bem-vindo de volta!</p>
      </div>
      <Link
        to="/aluno/anamnese"
        aria-label={pendencia ? 'Você tem pendências' : 'Sem pendências'}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-carbon hover:text-white"
      >
        <IconBell className="h-5 w-5" />
        {pendencia && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-flame ring-2 ring-night" />
        )}
      </Link>
    </div>
  )
}

/** Faixa da semana: dia de hoje destacado, ponto nos dias com treino previsto. */
function FaixaSemana({ programa }: { programa: Programa | null }) {
  const dias = diasDaSemana()
  const hoje = hojeSaoPaulo()
  const semana = programa ? semanaAtual(programa.data_inicio) : 0
  const comTreino = new Set<string>(
    (programa?.sessoes ?? [])
      .filter((s) => s.semana === semana)
      .flatMap((s) => s.dias_sugeridos ?? [])
  )

  return (
    <div className="mt-4 flex gap-1.5">
      {dias.map((d, i) => {
        const ehHoje = mesmaData(d, hoje)
        const treina = comTreino.has(DIAS_KEY[d.getDay()])
        return (
          <div
            key={i}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2.5 transition-colors ${
              ehHoje ? 'bg-flame text-white' : 'text-white/50'
            }`}
          >
            <span className="text-[11px] font-medium">{DIAS_LABEL[i]}</span>
            <span className={`text-sm ${ehHoje ? 'font-semibold text-white' : 'text-white/80'}`}>
              {d.getDate()}
            </span>
            <span
              className={`h-1 w-1 rounded-full ${
                treina ? (ehHoje ? 'bg-white' : 'bg-flame') : 'bg-transparent'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Progresso do ciclo de 30 dias — a métrica-âncora do produto. */
function Ciclo({ aluno }: { aluno: Aluno }) {
  const p = progressoPrograma(aluno.data_inicio, aluno.data_fim)
  const dia = p.fase === 'andamento' ? p.dia : p.fase === 'concluido' ? 30 : 0

  return (
    <div className={`mt-4 ${CARD}`}>
      <div className="flex items-end justify-between">
        <div>
          <p className={ROTULO}>Seu programa</p>
          {p.fase === 'andamento' && (
            <p className="mt-1 font-display text-3xl text-white">
              Dia {p.dia} <span className="text-base text-white/40">de 30</span>
            </p>
          )}
          {p.fase === 'antes' && (
            <p className="mt-1 font-display text-xl text-white">
              Começa em {p.diasParaComecar} {p.diasParaComecar === 1 ? 'dia' : 'dias'}
            </p>
          )}
          {p.fase === 'concluido' && (
            <p className="mt-1 font-display text-xl text-flame">Programa concluído!</p>
          )}
          {p.fase === 'sem-data' && (
            <p className="mt-1 font-display text-lg text-white">Sem data de início</p>
          )}
        </div>
        <span className="text-xs text-white/40">{Math.round((dia / 30) * 100)}%</span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-steel">
        <div
          className="h-full rounded-full bg-flame transition-all"
          style={{ width: `${(Math.min(Math.max(dia, 0), 30) / 30) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-white/35">
        <span>início {formatDateBR(aluno.data_inicio)}</span>
        <span>término {formatDateBR(aluno.data_fim)}</span>
      </div>
    </div>
  )
}

/**
 * "Atividade recente": barras de minutos por dia da semana (equivale ao
 * cartão de passos) + anéis de frequência e duração.
 */
function AtividadeRecente({
  aluno,
  programa,
  execucoes,
}: {
  aluno: Aluno
  programa: Programa | null
  execucoes: ExecucaoComSeries[]
}) {
  const dias = ultimos7Dias()
  const hoje = hojeSaoPaulo()

  const minutosPorDia = dias.map((d) =>
    Math.round(
      execucoes
        .filter((e) => mesmaData(new Date(e.iniciado_em), d))
        .reduce((soma, e) => soma + (e.duracao_seg ?? 0), 0) / 60
    )
  )
  const maxMin = Math.max(...minutosPorDia, 1)
  const minutosSemana = minutosPorDia.reduce((a, b) => a + b, 0)
  const treinosSemana = dias.reduce(
    (n, d) => n + execucoes.filter((e) => mesmaData(new Date(e.iniciado_em), d)).length,
    0
  )

  const freq = resumoFrequencia(programa, execucoes, aluno.data_inicio)
  const minutosTotais = Math.round(
    execucoes.reduce((soma, e) => soma + (e.duracao_seg ?? 0), 0) / 60
  )

  return (
    <section className="mt-7">
      <h2 className="font-display text-lg text-white">Atividade recente</h2>

      <Link to="/aluno/progresso" className={`mt-3 block ${CARD} transition-colors hover:bg-slate`}>
        <div className="flex items-center gap-2">
          <IconActivity className="h-5 w-5 text-flame" />
          <span className="flex-1 font-medium text-white">Treinos</span>
          <IconChevronRight className="h-4 w-4 text-white/30" />
        </div>

        <div className="mt-4 flex items-end gap-4">
          <div className="shrink-0">
            <p className="font-display text-2xl text-white">
              {treinosSemana} <span className="text-sm text-white/40">em 7 dias</span>
            </p>
            <p className="mt-0.5 text-xs text-white/40">
              {minutosSemana} min · {minutosTotais} min no total
            </p>
          </div>
          <div className="flex flex-1 items-end gap-1">
            {minutosPorDia.map((min, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-14 w-full items-end">
                  <div
                    className={`w-full rounded-t-md ${
                      mesmaData(dias[i], hoje) ? 'bg-flame' : 'bg-flame/30'
                    }`}
                    style={{ height: `${Math.max((min / maxMin) * 100, 5)}%` }}
                  />
                </div>
                <span className="text-[9px] text-white/30">{DIAS_INICIAL[dias[i].getDay()]}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className={CARD}>
          <div className="flex items-center gap-2">
            <IconFlame className="h-4 w-4 text-flame" />
            <span className="flex-1 text-sm font-medium text-white">Frequência</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="font-display text-xl text-white">
              {freq.percentual === null ? '—' : `${freq.percentual}%`}
            </p>
            <Anel pct={(freq.percentual ?? 0) / 100} cor="#FF5B22" />
          </div>
          <p className="mt-1 text-[11px] text-white/35">
            {freq.realizadas} de {freq.previstas} previstos
          </p>
        </div>

        <div className={CARD}>
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-white/70" />
            <span className="flex-1 text-sm font-medium text-white">Duração</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="font-display text-xl text-white">
              {minutosSemana} <span className="text-sm text-white/40">min</span>
            </p>
            <Anel pct={minutosSemana / 180} cor="#FFFFFF" />
          </div>
          <p className="mt-1 text-[11px] text-white/35">nos últimos 7 dias</p>
        </div>
      </div>
    </section>
  )
}

/** Sessões da semana em cartões roláveis — equivale a "Trending Plans". */
function SeuTreino({ aluno, programa }: { aluno: Aluno; programa: Programa | null }) {
  const scroller = useRef<HTMLDivElement>(null)
  // progresso 0..1 do scroll; visivel = fração do conteúdo à mostra (<1 rola).
  const [progresso, setProgresso] = useState(0)
  const [visivel, setVisivel] = useState(1)

  const medir = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgresso(max > 0 ? el.scrollLeft / max : 0)
    setVisivel(el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1)
  }, [])

  useEffect(() => {
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [medir, programa])

  if (!programa) {
    return (
      <section className="mt-7">
        <h2 className="font-display text-lg text-white">Seu treino</h2>
        <div className={`mt-3 ${CARD}`}>
          <p className="text-sm text-white/60">
            Seu coach ainda está montando seu treino. Enquanto isso, preencha a anamnese — ela é a
            base do seu programa.
          </p>
        </div>
      </section>
    )
  }

  const { hoje, proxima } = treinoDoDia(programa, aluno.data_inicio)
  const demonstrativo = UI_MODO_TESTE && programa.modo_teste
  const semana = semanaAtual(programa.data_inicio ?? aluno.data_inicio)
  const daSemana = programa.sessoes
    .filter((s) => s.semana === semana)
    .sort((a, b) => a.ordem - b.ordem)
  const lista: Sessao[] = daSemana.length > 0 ? daSemana : programa.sessoes.slice(0, 3)

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-white">Seu treino</h2>
        <Link to="/aluno/treino" className="text-xs font-medium text-flame">
          Ver programa
        </Link>
      </div>

      {!hoje && (
        <div className={`mt-3 flex items-center gap-2 ${CARD}`}>
          <IconMoon className="h-5 w-5 shrink-0 text-white/40" />
          <p className="text-sm text-white/70">
            Hoje é dia de recuperar — sem treino programado.
            {proxima && <span className="text-white/40"> Próximo: {proxima.titulo}</span>}
          </p>
        </div>
      )}

      <div
        ref={scroller}
        onScroll={medir}
        className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5"
      >
        {lista.map((s) => {
          const ehHoje = hoje?.id === s.id
          return (
            <div
              key={s.id}
              className={`relative flex w-64 shrink-0 flex-col justify-between overflow-hidden rounded-2xl p-5 ${
                ehHoje ? 'bg-gradient-to-br from-flame to-[#c9410f]' : 'bg-carbon'
              }`}
            >
              <div>
                <p
                  className={`text-[11px] font-medium uppercase tracking-wider ${
                    ehHoje ? 'text-white/80' : 'text-white/40'
                  }`}
                >
                  {ehHoje ? 'Treino de hoje' : `Semana ${s.semana}`}
                </p>
                <p className="mt-1 font-display text-xl leading-tight text-white">{s.titulo}</p>
                <p className={`mt-1 text-xs ${ehHoje ? 'text-white/80' : 'text-white/45'}`}>
                  {s.sessao_exercicios.length}{' '}
                  {s.sessao_exercicios.length === 1 ? 'exercício' : 'exercícios'}
                  {s.duracao_estimada_min ? ` · ~${s.duracao_estimada_min} min` : ''}
                </p>
                {demonstrativo && ehHoje && (
                  <p className="mt-2 inline-block rounded-full bg-black/25 px-2.5 py-0.5 text-[10px] text-white/90">
                    Demonstrativo
                  </p>
                )}
              </div>
              <Link
                to={`/aluno/treino/sessao/${s.id}`}
                className={`mt-5 self-start rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 ${
                  ehHoje ? 'bg-white text-night' : 'bg-flame text-white'
                }`}
              >
                {demonstrativo ? 'Simular' : 'Iniciar'}
              </Link>
            </div>
          )
        })}
      </div>

      {/* Indicador de scroll próprio: trilho discreto + preenchimento laranja
          que reflete a posição. Só aparece quando o conteúdo transborda. */}
      {visivel < 1 && (
        <div className="mt-5 flex justify-center" aria-hidden="true">
          <div className="h-1 w-14 overflow-hidden rounded-full bg-steel">
            <div
              className="h-full rounded-full bg-flame"
              style={{
                width: `${visivel * 100}%`,
                marginLeft: `${progresso * (100 - visivel * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function CardAnamnese({ anamnese }: { anamnese: Anamnese | null }) {
  const concluida = anamnese?.status === 'concluida'
  const consentimentoPendente = Boolean(anamnese && !anamnese.consentimento_em)
  const emDia = concluida && !consentimentoPendente

  const descricao = emDia
    ? 'Concluída — toque para revisar ou editar'
    : !anamnese
      ? 'Preencha para seu coach montar seu treino'
      : consentimentoPendente
        ? 'Preenchida pelo seu coach — revise e confirme'
        : 'Rascunho salvo — falta concluir'

  return (
    <Link
      to="/aluno/anamnese"
      className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-flame to-[#c9410f] p-5 transition-opacity hover:opacity-95"
    >
      <div className="min-w-0">
        <p className="font-medium text-white">Minha anamnese</p>
        <p className="mt-0.5 truncate text-sm text-white/80">{descricao}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white">
        {emDia ? 'concluída' : consentimentoPendente ? 'confirmar' : 'pendente'}
      </span>
    </Link>
  )
}

function CardCheckin({ aluno }: { aluno: Aluno }) {
  if (!aluno.data_inicio) return null
  const inicio = parseDateOnly(aluno.data_inicio)
  if (!inicio) return null
  const dia = Math.round((hojeSaoPaulo().getTime() - inicio.getTime()) / 86_400_000) + 1
  if (dia < 1 || dia > 30) return null

  const alvo = dia <= 15 ? 15 : 30
  const data = new Date(inicio.getTime() + (alvo - 1) * 86_400_000)
  const faltam = alvo - dia
  const dataFmt = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  const legenda =
    faltam === 0
      ? 'É hoje — combine o horário com seu coach.'
      : faltam === 1
        ? 'É amanhã, prepare-se para o encontro.'
        : 'Faltam poucos dias para nos encontrarmos.'

  return (
    <div className="mt-3 rounded-3xl bg-white text-ink shadow-sm">
      {/* topo: texto + contagem, separados por régua vertical */}
      <div className="flex items-stretch gap-4 px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-flame">
            Próximo check-in
          </p>
          <p className="mt-1.5 font-display text-2xl text-ink">
            {alvo === 15 ? 'Meio do ciclo' : 'Check-in final'}
          </p>
          <p className="mt-1.5 text-sm leading-snug text-ink/45">{legenda}</p>
        </div>
        <div className="w-px self-stretch bg-ink/10" />
        <div className="flex w-14 flex-col items-center justify-center text-flame">
          {faltam > 0 ? (
            <>
              <span className="font-display text-4xl leading-none">{faltam}</span>
              <span className="mt-1 text-sm">{faltam === 1 ? 'dia' : 'dias'}</span>
            </>
          ) : (
            <span className="font-display text-2xl leading-none">hoje</span>
          )}
        </div>
      </div>

      <div className="mx-5 border-t border-ink/10" />

      {/* rodapé: data + WhatsApp, separados por régua vertical */}
      <div className="flex items-center px-5 py-4">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flame/10 text-flame">
            <IconCalendar className="h-[18px] w-[18px]" />
          </span>
          <span className="whitespace-nowrap text-sm font-semibold text-ink">{dataFmt}</span>
        </div>
        <div className="mx-3.5 w-px self-stretch bg-ink/10" />
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flame/10 text-flame">
            <IconWhatsApp className="h-[19px] w-[19px]" />
          </span>
          <span className="text-xs leading-tight text-ink/70">Combine pelo WhatsApp</span>
        </div>
      </div>
    </div>
  )
}

function BotaoWhatsApp({ aluno }: { aluno: Aluno }) {
  const whatsapp = aluno.coach?.whatsapp
  if (!whatsapp) return null
  const nome = aluno.coach?.nome?.split(/\s+/)[0] ?? 'seu coach'
  return (
    <a
      href={`https://wa.me/${whatsappParaLink(whatsapp)}`}
      target="_blank"
      rel="noreferrer"
      className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-steel bg-carbon p-4 font-medium text-white transition-colors hover:bg-slate"
    >
      <IconChat className="h-5 w-5 shrink-0 text-flame" />
      Falar com {nome} no WhatsApp
    </a>
  )
}

function FichaResumo({ aluno }: { aluno: Aluno }) {
  const itens = [
    { rotulo: 'Status', valor: aluno.status },
    { rotulo: 'Objetivo', valor: aluno.objetivo ?? 'A definir com seu coach' },
    { rotulo: 'Nível', valor: aluno.nivel ?? 'A definir com seu coach' },
  ]
  return (
    <div className={`mt-3 grid gap-4 ${CARD}`}>
      {itens.map((i) => (
        <div key={i.rotulo}>
          <p className={ROTULO}>{i.rotulo}</p>
          <p className="mt-1 text-sm text-white">{i.valor}</p>
        </div>
      ))}
    </div>
  )
}

/** Corpo da Hoje: busca programa/execuções/anamnese uma única vez. */
function Conteudo({ aluno }: { aluno: Aluno }) {
  const { data: programa } = usePgQuery(fetchMeuPrograma)
  const { data: execucoes } = usePgQuery(fetchMinhasExecucoes)
  const { data: anamnese } = usePgQuery(fetchMinhaAnamnese)

  const nome = aluno.perfil?.nome?.trim().split(/\s+/)[0] ?? 'atleta'
  const pendencia = Boolean(
    anamnese === null || (anamnese && (anamnese.status !== 'concluida' || !anamnese.consentimento_em))
  )

  return (
    <div className="pb-4">
      <Header nome={nome} pendencia={pendencia} />
      {/* Separador limitado ao conteúdo (o do header é full-width) e mais
          discreto que ele, para dividir sem competir com o conteúdo. */}
      <div className="mt-5 border-t border-white/5" />
      <FaixaSemana programa={programa ?? null} />
      <Ciclo aluno={aluno} />
      <AtividadeRecente aluno={aluno} programa={programa ?? null} execucoes={execucoes ?? []} />
      <SeuTreino aluno={aluno} programa={programa ?? null} />

      <section className="mt-7">
        <h2 className="font-display text-lg text-white">Acompanhamento</h2>
        <CardAnamnese anamnese={anamnese ?? null} />
        <CardCheckin aluno={aluno} />
        <BotaoWhatsApp aluno={aluno} />
        <FichaResumo aluno={aluno} />
      </section>
    </div>
  )
}

export function HojePage() {
  const { status, data: aluno, errorMsg, refetch } = usePgQuery(fetchMeuRegistro)

  return (
    <>
      {status === 'loading' && <Skeleton />}
      {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}
      {status === 'ready' && !aluno && <SemVinculo />}
      {status === 'ready' && aluno && <Conteudo aluno={aluno} />}
    </>
  )
}
