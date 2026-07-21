import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../lib/api'
import {
  atualizarExercicio,
  criarExercicio,
  DIFICULDADES,
  fetchExercicios,
  GRUPOS_MUSCULARES,
} from '../../lib/exercicios'
import type { Exercicio, ExercicioForm } from '../../lib/exercicios'
import { useAuth } from '../../lib/auth'
import { usePgQuery } from '../../hooks/usePgQuery'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/DataState'

const inputClass =
  'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta'

const FORM_VAZIO: ExercicioForm = {
  nome: '',
  grupo_muscular: null,
  descricao: null,
  instrucoes: null,
  equipamento: null,
  dificuldade: null,
  video_url: null,
  imagem_url: null,
  seguranca: null,
  ativo: true,
}

function Editor({
  inicial,
  salvando,
  erro,
  onSalvar,
  onCancelar,
}: {
  inicial: ExercicioForm
  salvando: boolean
  erro: string | null
  onSalvar: (form: ExercicioForm) => void
  onCancelar: () => void
}) {
  const [form, setForm] = useState<ExercicioForm>(inicial)
  const set = <K extends keyof ExercicioForm>(campo: K, valor: ExercicioForm[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }))
  // Normalização (trim / vazio→null) só no submit — nunca no onChange,
  // senão o trim engole o espaço no fim enquanto o coach digita.
  const texto = (v: string) => (v.trim() === '' ? null : v.trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (form.nome.trim().length < 2) return
    onSalvar({
      ...form,
      nome: form.nome.trim(),
      equipamento: texto(form.equipamento ?? ''),
      descricao: texto(form.descricao ?? ''),
      instrucoes: texto(form.instrucoes ?? ''),
      seguranca: texto(form.seguranca ?? ''),
      video_url: texto(form.video_url ?? ''),
      imagem_url: texto(form.imagem_url ?? ''),
    })
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-4 rounded-2xl border border-terracotta/30 bg-white/70 p-5"
    >
      <div>
        <label htmlFor="e-nome" className="mb-1 block text-sm font-medium text-ink/80">
          Nome *
        </label>
        <input
          id="e-nome"
          type="text"
          required
          minLength={2}
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Ex.: Agachamento livre"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="e-grupo" className="mb-1 block text-sm font-medium text-ink/80">
            Grupo muscular
          </label>
          <select
            id="e-grupo"
            value={form.grupo_muscular ?? ''}
            onChange={(e) => set('grupo_muscular', e.target.value === '' ? null : e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione…</option>
            {GRUPOS_MUSCULARES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="e-dif" className="mb-1 block text-sm font-medium text-ink/80">
            Dificuldade
          </label>
          <select
            id="e-dif"
            value={form.dificuldade ?? ''}
            onChange={(e) =>
              set('dificuldade', e.target.value === '' ? null : (e.target.value as ExercicioForm['dificuldade']))
            }
            className={inputClass}
          >
            <option value="">Selecione…</option>
            {DIFICULDADES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="e-equip" className="mb-1 block text-sm font-medium text-ink/80">
          Equipamento
        </label>
        <input
          id="e-equip"
          type="text"
          value={form.equipamento ?? ''}
          onChange={(e) => set('equipamento', e.target.value)}
          placeholder="Ex.: halteres, barra, peso do corpo…"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="e-desc" className="mb-1 block text-sm font-medium text-ink/80">
          Descrição
        </label>
        <textarea
          id="e-desc"
          rows={2}
          value={form.descricao ?? ''}
          onChange={(e) => set('descricao', e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="e-instr" className="mb-1 block text-sm font-medium text-ink/80">
          Instruções de execução
        </label>
        <textarea
          id="e-instr"
          rows={3}
          value={form.instrucoes ?? ''}
          onChange={(e) => set('instrucoes', e.target.value)}
          placeholder="Passo a passo que o aluno vê durante o treino"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="e-seg" className="mb-1 block text-sm font-medium text-ink/80">
          Orientações de segurança
        </label>
        <textarea
          id="e-seg"
          rows={2}
          value={form.seguranca ?? ''}
          onChange={(e) => set('seguranca', e.target.value)}
          placeholder="Ex.: mantenha a coluna neutra; pare se sentir dor"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="e-video" className="mb-1 block text-sm font-medium text-ink/80">
            URL de vídeo (opcional)
          </label>
          <input
            id="e-video"
            type="url"
            value={form.video_url ?? ''}
            onChange={(e) => set('video_url', e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="e-img" className="mb-1 block text-sm font-medium text-ink/80">
            URL de imagem (opcional)
          </label>
          <input
            id="e-img"
            type="url"
            value={form.imagem_url ?? ''}
            onChange={(e) => set('imagem_url', e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </div>
      </div>

      {erro && (
        <p className="rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">{erro}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-xl bg-terracotta px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Salvar exercício'}
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={onCancelar}
          className="rounded-xl border border-ink/15 bg-white px-6 py-3 font-medium text-ink/70 transition-colors hover:border-terracotta disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function Exercicios() {
  const { session } = useAuth()
  const { status, data: exercicios, errorMsg, refetch } = usePgQuery(fetchExercicios)

  const [busca, setBusca] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [editando, setEditando] = useState<Exercicio | 'novo' | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [erroLista, setErroLista] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (exercicios ?? []).filter((e) => {
      if (!mostrarInativos && !e.ativo) return false
      if (filtroGrupo && e.grupo_muscular !== filtroGrupo) return false
      if (q && !e.nome.toLowerCase().includes(q) && !(e.equipamento ?? '').toLowerCase().includes(q))
        return false
      return true
    })
  }, [exercicios, busca, filtroGrupo, mostrarInativos])

  const salvar = async (form: Parameters<typeof criarExercicio>[2]) => {
    if (!session) {
      // nunca falhar em silêncio: sem sessão é estado quebrado, avisar
      setErroSalvar('Sessão não encontrada — recarregue a página e tente de novo.')
      return
    }
    setSalvando(true)
    setErroSalvar(null)
    try {
      if (editando === 'novo') {
        await criarExercicio(session.access_token, session.user.id, form)
      } else if (editando) {
        await atualizarExercicio(session.access_token, editando.id, form)
      }
      setEditando(null)
      refetch()
    } catch (err) {
      setErroSalvar(
        err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente novamente.'
      )
    } finally {
      setSalvando(false)
    }
  }

  const alternarAtivo = async (ex: Exercicio) => {
    if (!session) {
      setErroLista('Sessão não encontrada — recarregue a página e tente de novo.')
      return
    }
    setErroLista(null)
    try {
      await atualizarExercicio(session.access_token, ex.id, { ativo: !ex.ativo })
      refetch()
    } catch (err) {
      setErroLista(
        err instanceof ApiError
          ? err.message
          : `Não foi possível ${ex.ativo ? 'inativar' : 'reativar'} "${ex.nome}".`
      )
      refetch()
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Exercícios
          </h1>
          <p className="mt-1 text-sm text-ink/60">Sua biblioteca para montar os treinos</p>
        </div>
        {!editando && (
          <button
            onClick={() => {
              setEditando('novo')
              setErroSalvar(null)
            }}
            className="rounded-xl bg-terracotta px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Novo exercício
          </button>
        )}
      </div>

      {editando && (
        <Editor
          inicial={
            editando === 'novo'
              ? FORM_VAZIO
              : {
                  nome: editando.nome,
                  grupo_muscular: editando.grupo_muscular,
                  descricao: editando.descricao,
                  instrucoes: editando.instrucoes,
                  equipamento: editando.equipamento,
                  dificuldade: editando.dificuldade,
                  video_url: editando.video_url,
                  imagem_url: editando.imagem_url,
                  seguranca: editando.seguranca,
                  ativo: editando.ativo,
                }
          }
          salvando={salvando}
          erro={erroSalvar}
          onSalvar={salvar}
          onCancelar={() => setEditando(null)}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou equipamento…"
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta sm:max-w-xs"
        />
        <select
          value={filtroGrupo}
          onChange={(e) => setFiltroGrupo(e.target.value)}
          aria-label="Filtrar por grupo muscular"
          className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta"
        >
          <option value="">Todos os grupos</option>
          {GRUPOS_MUSCULARES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
            className="h-4 w-4 accent-terracotta"
          />
          mostrar inativos
        </label>
      </div>

      {erroLista && (
        <p className="mt-4 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta">
          {erroLista}
        </p>
      )}

      {status === 'loading' && <LoadingBlock />}
      {status === 'error' && <ErrorBlock message={errorMsg} onRetry={refetch} />}
      {status === 'ready' && (
        <div className="mt-6">
          {exercicios.length === 0 ? (
            <EmptyBlock message="Nenhum exercício ainda. Crie o primeiro — ele fica disponível para montar qualquer treino." />
          ) : filtrados.length === 0 ? (
            <EmptyBlock message="Nenhum exercício encontrado para essa busca." />
          ) : (
            <ul className="space-y-3">
              {filtrados.map((ex) => (
                <li
                  key={ex.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                    ex.ativo ? 'border-ink/10 bg-white/60' : 'border-ink/10 bg-ink/5 opacity-70'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {ex.nome}
                      {!ex.ativo && (
                        <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/60">
                          inativo
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-ink/60">
                      {[ex.grupo_muscular, ex.dificuldade, ex.equipamento]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditando(ex)
                        setErroSalvar(null)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink/70 transition-colors hover:border-terracotta"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => void alternarAtivo(ex)}
                      className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink/70 transition-colors hover:border-terracotta"
                    >
                      {ex.ativo ? 'Inativar' : 'Reativar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
