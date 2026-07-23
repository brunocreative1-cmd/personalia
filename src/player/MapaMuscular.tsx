/**
 * Mapa muscular estilizado (frente/costas) do player do aluno.
 * Silhueta construída por regiões nomeadas: primário = flame cheio,
 * secundário = flame translúcido, demais = neutro.
 * Os 16 MusculoId espelham 1:1 os slugs de public.musculos.
 */

export type MusculoId =
  | 'deltoides'
  | 'peitoral'
  | 'biceps'
  | 'antebraco'
  | 'abdomen'
  | 'obliquos'
  | 'quadriceps'
  | 'adutores'
  | 'tibial'
  | 'trapezio'
  | 'dorsal'
  | 'lombar'
  | 'triceps'
  | 'gluteos'
  | 'isquiotibiais'
  | 'panturrilha'

export const MUSCULO_LABEL: Record<MusculoId, string> = {
  deltoides: 'Ombros (deltoides)',
  peitoral: 'Peitoral',
  biceps: 'Bíceps',
  antebraco: 'Antebraços',
  abdomen: 'Abdômen',
  obliquos: 'Oblíquos',
  quadriceps: 'Quadríceps',
  adutores: 'Adutores',
  tibial: 'Tibial anterior',
  trapezio: 'Trapézio',
  dorsal: 'Dorsais',
  lombar: 'Lombar',
  triceps: 'Tríceps',
  gluteos: 'Glúteos',
  isquiotibiais: 'Posteriores de coxa',
  panturrilha: 'Panturrilhas',
}

/** Em qual vista cada músculo é visível (para o toggle automático). */
export const MUSCULO_VISTA: Record<MusculoId, 'frente' | 'costas'> = {
  deltoides: 'frente',
  peitoral: 'frente',
  biceps: 'frente',
  antebraco: 'frente',
  abdomen: 'frente',
  obliquos: 'frente',
  quadriceps: 'frente',
  adutores: 'frente',
  tibial: 'frente',
  trapezio: 'costas',
  dorsal: 'costas',
  lombar: 'costas',
  triceps: 'costas',
  gluteos: 'costas',
  isquiotibiais: 'costas',
  panturrilha: 'costas',
}

const COR_PRIMARIO = '#FF5B22'
const COR_NEUTRO = '#FFFFFF'

type Props = {
  vista: 'frente' | 'costas'
  primarios: MusculoId[]
  secundarios: MusculoId[]
}

export function MapaMuscular({ vista, primarios, secundarios }: Props) {
  const fillDe = (m: MusculoId): { fill: string; fillOpacity: number } => {
    if (primarios.includes(m)) return { fill: COR_PRIMARIO, fillOpacity: 0.95 }
    if (secundarios.includes(m)) return { fill: COR_PRIMARIO, fillOpacity: 0.35 }
    return { fill: COR_NEUTRO, fillOpacity: 0.08 }
  }
  const neutro = { fill: COR_NEUTRO, fillOpacity: 0.08 }

  return (
    <svg
      viewBox="0 0 220 460"
      role="img"
      aria-label={`Mapa muscular — vista de ${vista === 'frente' ? 'frente' : 'costas'}`}
      className="mx-auto h-64 w-auto"
    >
      {/* cabeça, pescoço, mãos, pés e pelve: neutros nas duas vistas */}
      <circle cx="110" cy="36" r="20" {...neutro} />
      <rect x="102" y="56" width="16" height="16" rx="6" {...neutro} />
      <circle cx="50" cy="232" r="7" {...neutro} />
      <circle cx="170" cy="232" r="7" {...neutro} />
      <ellipse cx="93" cy="432" rx="11" ry="8" {...neutro} />
      <ellipse cx="127" cy="432" rx="11" ry="8" {...neutro} />
      <rect x="90" y="198" width="40" height="26" rx="11" {...neutro} />
      {/* joelhos */}
      <circle cx="95" cy="322" r="8" {...neutro} />
      <circle cx="125" cy="322" r="8" {...neutro} />

      {vista === 'frente' ? (
        <>
          <ellipse cx="72" cy="92" rx="14" ry="12" {...fillDe('deltoides')} />
          <ellipse cx="148" cy="92" rx="14" ry="12" {...fillDe('deltoides')} />
          <ellipse cx="91" cy="116" rx="18" ry="14" {...fillDe('peitoral')} />
          <ellipse cx="129" cy="116" rx="18" ry="14" {...fillDe('peitoral')} />
          <ellipse cx="58" cy="138" rx="9" ry="21" {...fillDe('biceps')} />
          <ellipse cx="162" cy="138" rx="9" ry="21" {...fillDe('biceps')} />
          <ellipse cx="53" cy="192" rx="8" ry="24" {...fillDe('antebraco')} />
          <ellipse cx="167" cy="192" rx="8" ry="24" {...fillDe('antebraco')} />
          <rect x="97" y="134" width="26" height="58" rx="11" {...fillDe('abdomen')} />
          <ellipse cx="87" cy="162" rx="7" ry="24" {...fillDe('obliquos')} />
          <ellipse cx="133" cy="162" rx="7" ry="24" {...fillDe('obliquos')} />
          <ellipse cx="93" cy="268" rx="14" ry="40" {...fillDe('quadriceps')} />
          <ellipse cx="127" cy="268" rx="14" ry="40" {...fillDe('quadriceps')} />
          <ellipse cx="106" cy="252" rx="5" ry="26" {...fillDe('adutores')} />
          <ellipse cx="114" cy="252" rx="5" ry="26" {...fillDe('adutores')} />
          <ellipse cx="94" cy="376" rx="10" ry="34" {...fillDe('tibial')} />
          <ellipse cx="126" cy="376" rx="10" ry="34" {...fillDe('tibial')} />
        </>
      ) : (
        <>
          <ellipse cx="110" cy="88" rx="30" ry="15" {...fillDe('trapezio')} />
          <ellipse cx="72" cy="94" rx="13" ry="11" {...fillDe('deltoides')} />
          <ellipse cx="148" cy="94" rx="13" ry="11" {...fillDe('deltoides')} />
          <ellipse cx="92" cy="138" rx="15" ry="26" {...fillDe('dorsal')} />
          <ellipse cx="128" cy="138" rx="15" ry="26" {...fillDe('dorsal')} />
          <rect x="100" y="164" width="20" height="30" rx="8" {...fillDe('lombar')} />
          <ellipse cx="58" cy="138" rx="9" ry="21" {...fillDe('triceps')} />
          <ellipse cx="162" cy="138" rx="9" ry="21" {...fillDe('triceps')} />
          <ellipse cx="53" cy="192" rx="8" ry="24" {...fillDe('antebraco')} />
          <ellipse cx="167" cy="192" rx="8" ry="24" {...fillDe('antebraco')} />
          <ellipse cx="96" cy="222" rx="14" ry="17" {...fillDe('gluteos')} />
          <ellipse cx="124" cy="222" rx="14" ry="17" {...fillDe('gluteos')} />
          <ellipse cx="94" cy="282" rx="13" ry="34" {...fillDe('isquiotibiais')} />
          <ellipse cx="126" cy="282" rx="13" ry="34" {...fillDe('isquiotibiais')} />
          <ellipse cx="94" cy="376" rx="10" ry="32" {...fillDe('panturrilha')} />
          <ellipse cx="126" cy="376" rx="10" ry="32" {...fillDe('panturrilha')} />
        </>
      )}
    </svg>
  )
}
