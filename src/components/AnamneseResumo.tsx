import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  ANAMNESE_FORM_VAZIO,
  anamneseParaForm,
  atualizarAnamneseDoAluno,
  criarAnamneseDoAluno,
  fetchAnamneseDoAluno,
  normalizarAnamneseForm,
} from '../lib/anamnese'
import type { Anamnese, AnamneseForm } from '../lib/anamnese'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePgQuery } from '../hooks/usePgQuery'
import { AnamneseCampos } from './AnamneseCampos'
import { ErrorBlock, LoadingBlock } from './DataState'

function Item({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink/40">{rotulo}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-ink">{valor}</dd>
    </div>
  )
}

function temAlertaSaude(a: Anamnese): boolean {
  return Boolean(a.dores || a.lesoes || a.limitacoes || a.condicoes_saude || a.medicamentos || a.restricao_medica)
}

/**
 * Anamnese do aluno na visão do coach. Leitura + edição/criação (RLS
 * restringe a alunos vinculados). Consentimento é sempre do aluno: anamnese
 * criada/editada pelo coach nunca registra consentimento — quando pendente,
 * o aluno vê o aviso na tela dele e confirma por lá.
 */
export function AnamneseResumo({ profileId }: { profileId: string }) {
  const { session } = useAuth()
  const { status, data: anamnese, errorMsg, refetch } = usePgQuery(
    (token) => fetchAnamneseDoAluno(token, profileId),
    [profileId]
  )

  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<AnamneseForm>(ANAMNESE_FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const set = <K extends keyof AnamneseForm>(campo: K, valor: AnamneseForm[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  const abrirEdicao = () => {
    setForm(anamnese ? anamneseParaForm(anamnese) : ANAMNESE_FORM_VAZIO)
    setMsg(null)
    setEditando(true)
  }

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!session) {
      setMsg({ tipo: 'erro', texto: 'Sessão não encontrada — recarregue a página e tente de novo.' })
      return
    }
    setSalvando(true)
    setMsg(null)
    const dados = normalizarAnamneseForm(form)
    try {
      if (anamnese) {
        await atualizarAnamneseDoAluno(session.access_token, profileId, dados)
      } else {
        await criarAnamneseDoAluno(session.access_token, profileId, dados)
      }
      setEditando(false)
      refetch()
    } catch (err) {
      setMsg({
        tipo: 'erro',
        texto: err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente novamente.',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (status === 'loading') return <LoadingBlock />
  if (status === 'error') return <ErrorBlock message={errorMsg} onRetry={refetch} />

  if (editando) {
    return (
      <form onSubmit={salvar} className="mt-4 max-w-xl space-y-5 rounded-2xl border border-terracotta/30 bg-white/70 p-5">
        {!anamnese && (
          <p className="rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
            Você está preenchendo a anamnese pelo aluno (ex.: colhida por WhatsApp). O
            consentimento continua sendo dele: a anamnese fica marcada como pendente até o
            aluno revisar e confirmar no app.
          </p>
        )}

        <AnamneseCampos form={form} set={set} idPrefix="ca" />

        <div>
          <label htmlFor="ca-status" className="mb-1 block text-sm font-medium text-ink/80">
            Situação da anamnese
          </label>
          <select
            id="ca-status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as AnamneseForm['status'])}
            className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta"
          >
            <option value="incompleta">incompleta</option>
            <option value="concluida">concluída</option>
          </select>
        </div>

        {msg && (
          <p className="rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{msg.texto}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl bg-terracotta px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Salvar anamnese'}
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={() => setEditando(false)}
            className="rounded-xl border border-ink/15 bg-white px-6 py-3 font-medium text-ink/70 transition-colors hover:border-terracotta disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    )
  }

  if (!anamnese) {
    return (
      <div className="mt-4">
        <p className="rounded-xl border border-dashed border-ink/20 bg-white/40 px-4 py-5 text-sm text-ink/60">
          O aluno ainda não preencheu a anamnese. Peça pelo WhatsApp — ou, se já colheu as
          respostas, preencha por ele (o consentimento dele fica pendente até confirmar no app).
        </p>
        <button
          onClick={abrirEdicao}
          className="mt-3 rounded-xl border border-terracotta px-5 py-2.5 text-sm font-medium text-terracotta transition-colors hover:bg-terracotta hover:text-white"
        >
          Preencher pelo aluno
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            anamnese.status === 'concluida'
              ? 'bg-sage/15 text-sage'
              : 'bg-terracotta/15 text-terracotta'
          }`}
        >
          {anamnese.status === 'concluida' ? 'concluída' : 'incompleta'}
        </span>
        {anamnese.consentimento_em ? (
          <span className="text-xs text-ink/50">
            consentimento em {new Date(anamnese.consentimento_em).toLocaleDateString('pt-BR')}
          </span>
        ) : (
          <span className="rounded-full bg-terracotta/15 px-3 py-1 text-xs font-medium text-terracotta">
            preenchida pelo coach — consentimento do aluno pendente
          </span>
        )}
        {anamnese.atualizado_por_papel && (
          <span className="text-xs text-ink/50">
            última edição por {anamnese.atualizado_por_papel === 'coach' ? 'você (coach)' : 'aluno'}{' '}
            em {new Date(anamnese.updated_at).toLocaleString('pt-BR')}
          </span>
        )}
        <button
          onClick={abrirEdicao}
          className="rounded-xl border border-ink/15 bg-white px-4 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-terracotta hover:text-terracotta"
        >
          Editar anamnese
        </button>
      </div>

      {temAlertaSaude(anamnese) && (
        <div className="mt-4 rounded-xl border border-terracotta/30 bg-terracotta/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-terracotta">
            Atenção — saúde
          </p>
          <dl className="mt-3 space-y-3">
            <Item rotulo="Dores" valor={anamnese.dores} />
            <Item rotulo="Lesões" valor={anamnese.lesoes} />
            <Item rotulo="Limitações" valor={anamnese.limitacoes} />
            <Item rotulo="Condições de saúde" valor={anamnese.condicoes_saude} />
            <Item rotulo="Medicamentos" valor={anamnese.medicamentos} />
            <Item rotulo="Restrição médica" valor={anamnese.restricao_medica} />
          </dl>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-ink/10 bg-white/60 p-5 sm:grid-cols-3">
        <Item rotulo="Objetivo" valor={anamnese.objetivo_principal} />
        <Item rotulo="Histórico" valor={anamnese.historico_treino} />
        <Item rotulo="Nível" valor={anamnese.nivel} />
        <Item
          rotulo="Frequência"
          valor={
            anamnese.frequencia_semanal
              ? `${anamnese.frequencia_semanal}x/semana`
              : null
          }
        />
        <Item
          rotulo="Dias"
          valor={anamnese.dias_disponiveis?.length ? anamnese.dias_disponiveis.join(', ') : null}
        />
        <Item rotulo="Local" valor={anamnese.local_treino} />
        <Item rotulo="Equipamentos" valor={anamnese.equipamentos} />
        <Item
          rotulo="Duração"
          valor={anamnese.duracao_disponivel_min ? `${anamnese.duracao_disponivel_min} min` : null}
        />
        <Item rotulo="Sono" valor={anamnese.qualidade_sono} />
        <Item rotulo="Energia" valor={anamnese.energia} />
        <div className="col-span-2 sm:col-span-3">
          <Item rotulo="Dificuldade de consistência" valor={anamnese.dificuldade_consistencia} />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <Item rotulo="Observações do aluno" valor={anamnese.observacoes} />
        </div>
      </dl>
    </div>
  )
}
