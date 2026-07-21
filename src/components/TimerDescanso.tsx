import { useEffect, useRef, useState } from 'react'
import { IconCheckCircle } from './icons'

let audioCtx: AudioContext | null = null

/**
 * Deve ser chamada ainda dentro do gesto (tap no ✓) que vai disparar o timer:
 * AudioContext criado fora de interação nasce suspenso e o bipe é bloqueado.
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
  'h-12 min-w-16 rounded-xl border border-cream/25 px-3 font-medium text-cream transition-colors hover:border-cream/60'

/**
 * Countdown de descanso entre séries. A contagem deriva de um timestamp-alvo
 * (nunca de setInterval acumulado): ao voltar de outra aba ou ligação, o
 * próximo tick recalcula o restante correto.
 */
export function TimerDescanso({
  duracaoSeg,
  onFechar,
}: {
  duracaoSeg: number
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
      setTerminaEm((t) => Math.max(Date.now(), t + deltaSeg * 1000))
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

  return (
    <div className="fixed inset-x-0 bottom-0 z-20">
      <div className="mx-auto max-w-md px-5 pb-4">
        <div
          className="rounded-2xl bg-ink p-4 text-center text-cream shadow-xl"
          role="timer"
          aria-live="polite"
        >
          {acabou ? (
            <>
              <p className="flex items-center justify-center gap-2 font-display text-4xl font-semibold">
                Pode ir! <IconCheckCircle className="h-8 w-8" />
              </p>
              <button onClick={onFechar} className={`${btnClass} mt-3 w-full`}>
                Fechar
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-cream/60">
                Descanso{pausado ? ' · pausado' : ''}
              </p>
              <p className="font-display text-6xl font-semibold tabular-nums leading-tight">
                {mostrador}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button onClick={() => ajustar(-15)} className={btnClass} aria-label="Menos 15 segundos">
                  −15s
                </button>
                <button
                  onClick={pausarOuRetomar}
                  className={btnClass}
                  aria-label={pausado ? 'Retomar descanso' : 'Pausar descanso'}
                >
                  {pausado ? '▶ Retomar' : '⏸ Pausar'}
                </button>
                <button onClick={() => ajustar(15)} className={btnClass} aria-label="Mais 15 segundos">
                  +15s
                </button>
              </div>
              <button
                onClick={onFechar}
                className="mt-2 w-full py-2 text-sm text-cream/60 underline transition-colors hover:text-cream"
              >
                Pular descanso
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
