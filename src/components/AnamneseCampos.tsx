import { DIAS_SEMANA } from '../lib/anamnese'
import type { AnamneseForm } from '../lib/anamnese'

const inputClass =
  'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-terracotta'

function Campo({
  id,
  rotulo,
  children,
}: {
  id: string
  rotulo: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink/80">
        {rotulo}
      </label>
      {children}
    </div>
  )
}

/**
 * Campos da anamnese, compartilhados entre a página do aluno e a edição
 * pelo coach na ficha. Os valores vão CRUS para o estado (sem trim no
 * onChange — ver normalizarAnamneseForm, aplicada só no salvar).
 */
export function AnamneseCampos({
  form,
  set,
  idPrefix = 'a',
}: {
  form: AnamneseForm
  set: <K extends keyof AnamneseForm>(campo: K, valor: AnamneseForm[K]) => void
  idPrefix?: string
}) {
  const toggleDia = (dia: string) => {
    const atual = form.dias_disponiveis ?? []
    set(
      'dias_disponiveis',
      atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia]
    )
  }

  return (
    <>
      <h2 className="font-display text-lg font-semibold text-ink">Treino</h2>

      <Campo id={`${idPrefix}-objetivo`} rotulo="Objetivo principal">
        <input
          id={`${idPrefix}-objetivo`}
          type="text"
          value={form.objetivo_principal ?? ''}
          onChange={(e) => set('objetivo_principal', e.target.value)}
          placeholder="Ex.: perder gordura, ganhar massa…"
          className={inputClass}
        />
      </Campo>

      <Campo id={`${idPrefix}-historico`} rotulo="Histórico de treino">
        <select
          id={`${idPrefix}-historico`}
          value={form.historico_treino ?? ''}
          onChange={(e) => set('historico_treino', e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione…</option>
          <option value="nunca treinei">Nunca treinei</option>
          <option value="parado ha mais de 6 meses">Parado há mais de 6 meses</option>
          <option value="treino irregular">Treino, mas de forma irregular</option>
          <option value="treino regular">Treino regularmente</option>
        </select>
      </Campo>

      <Campo id={`${idPrefix}-nivel`} rotulo="Como você se considera">
        <select
          id={`${idPrefix}-nivel`}
          value={form.nivel ?? ''}
          onChange={(e) => set('nivel', e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione…</option>
          <option value="iniciante">Iniciante</option>
          <option value="intermediario">Intermediário</option>
          <option value="avancado">Avançado</option>
        </select>
      </Campo>

      <Campo id={`${idPrefix}-freq`} rotulo="Quantos dias por semana você tem para treinar?">
        <select
          id={`${idPrefix}-freq`}
          value={form.frequencia_semanal ?? ''}
          onChange={(e) =>
            set('frequencia_semanal', e.target.value === '' ? null : Number(e.target.value))
          }
          className={inputClass}
        >
          <option value="">Selecione…</option>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'dia' : 'dias'}
            </option>
          ))}
        </select>
      </Campo>

      <div>
        <p className="mb-2 text-sm font-medium text-ink/80">Dias disponíveis</p>
        <div className="flex flex-wrap gap-2">
          {DIAS_SEMANA.map((dia) => {
            const ativo = (form.dias_disponiveis ?? []).includes(dia)
            return (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                aria-pressed={ativo}
                className={`min-w-11 rounded-full border px-3 py-2 text-sm capitalize transition-colors ${
                  ativo
                    ? 'border-terracotta bg-terracotta text-white'
                    : 'border-ink/15 bg-white text-ink/70'
                }`}
              >
                {dia}
              </button>
            )
          })}
        </div>
      </div>

      <Campo id={`${idPrefix}-local`} rotulo="Onde você vai treinar?">
        <select
          id={`${idPrefix}-local`}
          value={form.local_treino ?? ''}
          onChange={(e) => set('local_treino', e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione…</option>
          <option value="academia">Academia</option>
          <option value="casa">Em casa</option>
          <option value="condominio">Academia do condomínio</option>
          <option value="ar livre">Ao ar livre</option>
          <option value="misto">Misto</option>
        </select>
      </Campo>

      <Campo id={`${idPrefix}-equip`} rotulo="Equipamentos disponíveis">
        <input
          id={`${idPrefix}-equip`}
          type="text"
          value={form.equipamentos ?? ''}
          onChange={(e) => set('equipamentos', e.target.value)}
          placeholder="Ex.: halteres, elástico, barra…"
          className={inputClass}
        />
      </Campo>

      <Campo id={`${idPrefix}-duracao`} rotulo="Tempo disponível por treino">
        <select
          id={`${idPrefix}-duracao`}
          value={form.duracao_disponivel_min ?? ''}
          onChange={(e) =>
            set('duracao_disponivel_min', e.target.value === '' ? null : Number(e.target.value))
          }
          className={inputClass}
        >
          <option value="">Selecione…</option>
          {[20, 30, 45, 60, 90].map((n) => (
            <option key={n} value={n}>
              {n} minutos
            </option>
          ))}
        </select>
      </Campo>

      <h2 className="pt-2 font-display text-lg font-semibold text-ink">Saúde</h2>
      <p className="-mt-3 text-xs text-ink/50">
        Informações usadas apenas para adaptar o treino com segurança.
      </p>

      <Campo id={`${idPrefix}-dores`} rotulo="Sente alguma dor? Onde?">
        <textarea
          id={`${idPrefix}-dores`}
          value={form.dores ?? ''}
          onChange={(e) => set('dores', e.target.value)}
          rows={2}
          placeholder="Ex.: dor no joelho ao agachar"
          className={inputClass}
        />
      </Campo>

      <Campo id={`${idPrefix}-lesoes`} rotulo="Lesões (atuais ou antigas)">
        <textarea
          id={`${idPrefix}-lesoes`}
          value={form.lesoes ?? ''}
          onChange={(e) => set('lesoes', e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Campo>

      <Campo id={`${idPrefix}-limitacoes`} rotulo="Limitações de movimento">
        <textarea
          id={`${idPrefix}-limitacoes`}
          value={form.limitacoes ?? ''}
          onChange={(e) => set('limitacoes', e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Campo>

      <Campo id={`${idPrefix}-condicoes`} rotulo="Condições de saúde que queira informar">
        <textarea
          id={`${idPrefix}-condicoes`}
          value={form.condicoes_saude ?? ''}
          onChange={(e) => set('condicoes_saude', e.target.value)}
          rows={2}
          placeholder="Ex.: pressão alta, diabetes…"
          className={inputClass}
        />
      </Campo>

      <Campo id={`${idPrefix}-medicamentos`} rotulo="Medicamentos em uso que queira informar">
        <textarea
          id={`${idPrefix}-medicamentos`}
          value={form.medicamentos ?? ''}
          onChange={(e) => set('medicamentos', e.target.value)}
          rows={2}
          className={inputClass}
        />
      </Campo>

      <Campo id={`${idPrefix}-restricao`} rotulo="Alguma restrição médica para exercícios?">
        <input
          id={`${idPrefix}-restricao`}
          type="text"
          value={form.restricao_medica ?? ''}
          onChange={(e) => set('restricao_medica', e.target.value)}
          placeholder="Ex.: liberado sem impacto, segundo o médico"
          className={inputClass}
        />
      </Campo>

      <h2 className="pt-2 font-display text-lg font-semibold text-ink">Rotina</h2>

      <Campo id={`${idPrefix}-sono`} rotulo="Qualidade do sono">
        <select
          id={`${idPrefix}-sono`}
          value={form.qualidade_sono ?? ''}
          onChange={(e) => set('qualidade_sono', e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione…</option>
          <option value="ruim">Ruim</option>
          <option value="regular">Regular</option>
          <option value="boa">Boa</option>
        </select>
      </Campo>

      <Campo id={`${idPrefix}-energia`} rotulo="Energia no dia a dia">
        <select
          id={`${idPrefix}-energia`}
          value={form.energia ?? ''}
          onChange={(e) => set('energia', e.target.value)}
          className={inputClass}
        >
          <option value="">Selecione…</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>
      </Campo>

      <Campo id={`${idPrefix}-dificuldade`} rotulo="Maior dificuldade para manter a consistência">
        <textarea
          id={`${idPrefix}-dificuldade`}
          value={form.dificuldade_consistencia ?? ''}
          onChange={(e) => set('dificuldade_consistencia', e.target.value)}
          rows={2}
          placeholder="Ex.: falta de tempo, desânimo, rotina…"
          className={inputClass}
        />
      </Campo>

      <Campo id={`${idPrefix}-obs`} rotulo="Algo mais que o coach deva saber?">
        <textarea
          id={`${idPrefix}-obs`}
          value={form.observacoes ?? ''}
          onChange={(e) => set('observacoes', e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Campo>
    </>
  )
}
