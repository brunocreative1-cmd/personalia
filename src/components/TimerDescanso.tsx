import { useEffect, useRef, useState } from 'react'
import { IconCheckCircle, IconClock } from './icons'

let audioCtx: AudioContext | null = null

/**
 * Deve ser chamada ainda dentro do gesto que dispara o timer. Um AudioContext
 * criado fora de uma interação pode nascer suspenso e ter o bipe bloqueado.
 */
export function prepararAudio() {
  try {
    audioCtx = audioCtx ?? new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    audioCtx = null
  }
}

/** Vibração + bipe duplo curto; silencioso se o navegador bloquear qualquer um. */
function sinalizarFim() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    /* sem vibração */
  }
  try {
    if (!audioCtx || audioCtx.state !== 'running') return
    const t0 = audioCtx.currentTime
    for (const inicio of [0, 0.25]) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t0 + inicio)
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + inicio + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + inicio + 0.18)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(t0 + inicio)
      osc.stop(t0 + inicio + 0.2)
    }
  } catch {
    /* sem bipe */
  }
}

const btnClass =
  'flex h-12 min-w-0 items-center justify-center rounded-xl border border-white/10 bg-slate px-2 text-sm font-semibold text-white/70 transition-colors hover:border-flame/60 hover:text-white'

/**
 * Countdown integrado ao card de séries. A contagem deriva de um timestamp-alvo
 * para permanecer correta quando a aba perde o foco.
 */
export function TimerDescanso({
  duracaoSeg,
  proximo,
  onFechar,
}: {
  duracaoSeg: number
  proximo?: string
  onFechar: () => void
}) {
  const [terminaEm, setTerminaEm] = useState(() => Date.now() + duracaoSeg * 1000)
  const [pausadoRestanteMs, setPausadoRestanteMs] = useState<number | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const sinalizado = useRef(false)

  const pausado = pausadoRestanteMs !== null
  const restanteMs = pausado ? pausadoRestanteMs : Math.max(0, terminaEm - agora)
  const acabou = !pausado && restanteMs <= 0

  useEffect(() => {
    if (pausado || acabou) return
    const tick = () => setAgora(Date.now())
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [pausado, acabou])

  useEffect(() => {
    if (!acabou || sinalizado.current) return
    sinalizado.current = true
    sinalizarFim()
    const id = setTimeout(onFechar, 5000)
    return () => clearTimeout(id)
  }, [acabou, onFechar])

  const ajustar = (deltaSeg: number) => {
    if (pausado) {
      setPausadoRestanteMs(Math.max(0, pausadoRestanteMs + deltaSeg * 1000))
    } else {
      setTerminaEm((tempo) => Math.max(Date.now(), tempo + deltaSeg * 1000))
      setAgora(Date.now())
    }
  }

  const pausarOuRetomar = () => {
    if (pausado) {
      setTerminaEm(Date.now() + pausadoRestanteMs)
      setAgora(Date.now())
      setPausadoRestanteMs(null)
    } else {
      setPausadoRestanteMs(restanteMs)
    }
  }

  const totalSeg = Math.ceil(restanteMs / 1000)
  const mostrador = `${Math.floor(totalSeg / 60)}:${String(totalSeg % 60).padStart(2, '0')}`
  const progresso = Math.min(1, Math.max(0, restanteMs / Math.max(1, duracaoSeg * 1000)))

  return (
    <div
      className="exercise-rest-reveal flex min-h-[21rem] flex-col justify-center text-center text-white"
      role="timer"
      aria-live="polite"
    >
      {acabou ? (
        <div className="flex flex-col items-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-flame text-white shadow-[0_0_0_8px_rgba(255,91,34,0.1)]">
            <IconCheckCircle className="h-10 w-10" />
          </span>
          <p className="mt-5 font-display text-2xl">Pode continuar</p>
          {proximo && <p className="mt-1 text-sm text-white/45">{proximo}</p>}
          <button
            type="button"
            onClick={onFechar}
            className="mt-6 w-full rounded-xl bg-flame py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Continuar treino
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-flame">
            <IconClock className="h-4 w-4" />
            <span>{pausado ? 'Descanso pausado' : 'Recupere o fôlego'}</span>
          </div>

          <div
            className="mx-auto mt-4 flex h-40 w-40 items-center justify-center rounded-full p-[6px] shadow-[0_0_36px_rgba(255,91,34,0.08)]"
            style={{
              background: `conic-gradient(#FF5B22 ${progresso * 360}deg, #343434 0deg)`,
            }}
            aria-label={`${totalSeg} segundos restantes`}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-carbon">
              <span className="font-display text-5xl tabular-nums leading-none">{mostrador}</span>
              <span className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/35">
                {pausado ? 'pausado' : 'restantes'}
              </span>
            </div>
          </div>

          {proximo && (
            <div className="mx-auto mt-4 rounded-full border border-white/8 bg-slate px-4 py-2 text-xs text-white/55">
              {proximo}
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => ajustar(-15)}
              className={btnClass}
              aria-label="Menos 15 segundos"
            >
              −15s
            </button>
            <button
              type="button"
              onClick={pausarOuRetomar}
              className={btnClass}
              aria-label={pausado ? 'Retomar descanso' : 'Pausar descanso'}
            >
              {pausado ? 'Retomar' : 'Pausar'}
            </button>
            <button
              type="button"
              onClick={() => ajustar(15)}
              className={btnClass}
              aria-label="Mais 15 segundos"
            >
              +15s
            </button>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="mt-2 w-full py-2 text-sm text-white/40 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
          >
            Pular descanso
          </button>
        </>
      )}
    </div>
  )
}
