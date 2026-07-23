# Design system — área do aluno

Versão documentada: 22 de julho de 2026
Referência visual principal: rota `/aluno` (tela **Hoje**)
Escopo: aplicativo mobile do aluno da Personal IA

## 1. Objetivo

Este documento transforma a linguagem visual já aplicada na página **Hoje** em um sistema reutilizável para as demais páginas da área do aluno. Ele registra:

- os padrões que já existem no código e na interface renderizada;
- o significado de cores, tamanhos, espaçamentos e estados;
- as regras de composição dos componentes;
- os pontos que precisam ser normalizados antes da replicação.

A intenção não é copiar literalmente cada card da página Hoje. As próximas telas devem reutilizar a mesma hierarquia, densidade, contraste e comportamento, escolhendo apenas os componentes adequados ao conteúdo de cada rota.

## 2. Fontes de verdade

| Responsabilidade | Arquivo atual |
|---|---|
| Tokens globais, fontes e utilitários | `src/index.css` |
| Casca, cabeçalho institucional e navegação inferior | `src/components/AlunoLayout.tsx` |
| Composição visual e componentes de referência | `src/pages/aluno/HojePage.tsx` |
| Player da sessão | `src/pages/aluno/TreinoPlayer.tsx` |
| Painel de descanso | `src/components/TimerDescanso.tsx` |
| Ícones lineares | `src/components/icons.tsx` |
| Logotipo | `src/components/Logo.tsx` |
| Imagens dos treinos | `public/images/workouts/` |
| Grafismo decorativo | `public/images/line-fundo.svg` |
| Fontes externas e cor do navegador | `index.html` |
| Configuração visual do PWA | `public/manifest.webmanifest` |

> Estado atual: o tema escuro está consolidado em `/aluno` e no player da sessão. As rotas Treino, Progresso e Perfil/Anamnese ainda usam majoritariamente o sistema claro anterior. A seção 18 define o contrato de migração.

## 3. Princípios visuais

### 3.1 Escuro, atlético e premium

O fundo quase preto reduz ruído e faz fotos, números e ações prioritárias ganharem presença. Os cartões não usam cinza claro: criam profundidade com diferenças pequenas entre `night`, `carbon`, `slate` e `steel`.

### 3.2 Laranja com significado

O laranja não é uma decoração genérica. Ele comunica:

- ação prioritária;
- item atual ou selecionado;
- progresso;
- dado positivo ou destaque de performance;
- pequenos sinais de identidade.

Em uma mesma região, apenas um elemento deve competir como ação primária. Nos cards de treino, por exemplo, o botão laranja pertence exclusivamente ao **treino de hoje**; os demais usam botão branco.

### 3.3 Informação em camadas

A leitura segue esta ordem:

1. título ou número principal;
2. contexto imediato;
3. metadado ou explicação;
4. ação.

Rótulos em caixa alta e baixa opacidade introduzem o contexto sem disputar atenção com a informação principal.

### 3.4 Mobile primeiro

A área do aluno é tratada como um aplicativo vertical e de uma coluna. O conteúdo tem largura máxima controlada, navegação fixa inferior, cards fáceis de tocar e carrosséis horizontais quando a comparação lateral é útil.

### 3.5 Poucas formas, repetidas com consistência

O sistema usa principalmente:

- cartões arredondados;
- botões em formato de pílula;
- ícones lineares;
- anéis e barras de progresso;
- divisórias discretas;
- imagens fotográficas com sobreposição escura.

## 4. Fundação e tokens

### 4.1 Paleta existente

Os nomes abaixo já são tokens Tailwind definidos em `src/index.css`.

| Token | Valor | Papel na área do aluno |
|---|---:|---|
| `night` | `#0F0F0F` | fundo principal da aplicação |
| `carbon` | `#1A1A1A` | superfície padrão dos cards e da navegação |
| `slate` | `#242424` | superfície elevada e estado hover |
| `steel` | `#2E2E2E` | bordas, trilhas e divisórias fortes |
| `flame` | `#FF5B22` | ação primária, seleção, progresso e destaque |
| `cream` | `#F0EDE6` | legado do tema claro; não usar como fundo do aluno dark |
| `ink` | `#252320` | texto sobre superfícies claras, especialmente o check-in |
| `terracotta` | `#C4623A` | legado do tema claro; não substituir `flame` na área dark |
| `sage` | `#4A6B52` | token global disponível, ainda sem papel central nesta tela |

Valores adicionais usados hoje:

| Valor | Uso atual | Diretriz |
|---:|---|---|
| `#121212` | fundo dos cards de treino | normalizar futuramente como `surface-workout` ou substituir por um token compartilhado |
| `#C9410F` | final do gradiente da anamnese | reservar a gradientes de ação/estado concluído |
| `#FFFFFF` | texto principal, botão secundário e card de check-in | branco puro somente quando contraste máximo for intencional |

### 4.2 Cores semânticas recomendadas

Estes aliases ainda não existem no CSS, mas devem orientar a migração para evitar escolhas arbitrárias por página.

| Papel semântico | Token atual correspondente |
|---|---|
| `app-background` | `night` |
| `surface-default` | `carbon` |
| `surface-hover` | `slate` |
| `surface-border` | `steel` |
| `surface-workout` | `#121212` |
| `action-primary` | `flame` |
| `text-primary-dark` | branco |
| `text-secondary-dark` | branco com 50–70% de opacidade |
| `text-muted-dark` | branco com 30–40% de opacidade |
| `surface-inverse` | branco |
| `text-primary-light` | `ink` |

### 4.3 Hierarquia de contraste

Sobre fundo escuro:

| Nível | Padrão | Exemplos |
|---|---|---|
| Primário | `text-white` | títulos, números e ações |
| Secundário | `text-white/70` ou `/80` | descrição importante e categoria |
| Terciário | `text-white/50` | saudação secundária e apoio |
| Muted | `text-white/35` ou `/40` | datas, porcentagens auxiliares e rótulos |
| Decorativo | `text-white/30` | setas e eixos de gráfico |

Evitar texto informativo abaixo de 40% de opacidade quando ele for necessário para completar uma tarefa. Opacidades de 30–35% devem ficar restritas a informação redundante ou decorativa.

Sobre fundo claro:

| Nível | Padrão |
|---|---|
| Primário | `text-ink` |
| Secundário | `text-ink/70` |
| Terciário | `text-ink/45` |
| Divisória | `border-ink/10` |

### 4.4 Tipografia

Fontes carregadas no projeto:

- **Manrope 600/700/800**: títulos e números de destaque na área do aluno;
- **Plus Jakarta Sans 400/500/600/700**: corpo, controles, rótulos e metadados;
- **Poppins 500/600/700**: fonte de display global e área do coach; não deve aparecer visualmente nos títulos dentro de `.aluno-app`.

O seletor `.aluno-app .font-display` troca Poppins por Manrope e mantém peso 700 e `letter-spacing: -0.02em`.

Escala observada:

| Uso | Classe de referência | Tamanho/linha | Peso |
|---|---|---:|---:|
| Número hero | `text-3xl` | 30/36 px | 700 |
| Número grande de prazo | `text-4xl leading-none` | 36/36 px | 700 |
| Título de card destacado | `text-2xl` | 24/32 px | 700 |
| Métrica | `text-xl` | 20/28 px | 700 |
| Título de seção e de treino | `text-lg` | 18/28 px | 700 |
| Texto padrão | base | 16/24 px | 400–600 |
| Texto auxiliar | `text-sm` | 14/20 px | 400–600 |
| Metadado | `text-xs` | 12/16 px | 400–600 |
| Rótulo superior | `text-[11px] uppercase tracking-wider` | 11 px | 500–700 |
| Eixo de gráfico | `text-[9px]` | 9 px | 400 |

Regras:

- usar `font-display` em títulos, métricas e números que precisam de presença;
- usar a fonte de corpo nos textos longos e controles;
- títulos usam sentence case: “Atividade recente”, não “ATIVIDADE RECENTE”;
- rótulos curtos podem usar caixa alta e tracking ampliado;
- evitar mais de duas famílias visíveis na mesma área;
- preservar `leading-snug` em textos compactos e `leading-relaxed` quando houver duas linhas de metadados.

### 4.5 Espaçamento

A malha segue múltiplos de 4 px, com 12, 16, 20 e 28 px como valores dominantes.

| Papel | Valor de referência |
|---|---:|
| Margem horizontal da tela | 20 px (`px-5`) |
| Espaço entre cards relacionados | 12 px (`gap-3`, `mt-3`) |
| Padding padrão de card | 20 px (`p-5`) |
| Padding compacto de card | 16 px (`p-4`) |
| Distância entre seções | 28 px (`mt-7`) |
| Distância curta entre título e conteúdo | 12 px (`mt-3`) |
| Separação antes de bloco interno | 16 px (`mt-4`) |
| Respiro final da página | 16 px, além da reserva da navegação |

Não comprimir o espaço entre seções para ganhar tela. A densidade deve ser obtida reduzindo conteúdo redundante, não removendo respiro estrutural.

### 4.6 Raios

| Componente | Raio |
|---|---:|
| Card padrão | 16 px (`rounded-2xl`) |
| Card editorial/inverso | 24 px (`rounded-3xl`) |
| Seleção de dia | 16 px |
| Botão principal | pílula (`rounded-full`) |
| Avatar e ícone em fundo | círculo |
| Barra de progresso | pílula |

Use 24 px apenas em cards que precisam parecer especiais, como o check-in branco. O restante deve conservar 16 px para não perder contraste hierárquico.

### 4.7 Bordas, elevação e profundidade

- cards padrão dependem principalmente da diferença entre `night` e `carbon`, sem sombra pesada;
- borda padrão escura: `steel` ou `white/5`;
- treino de hoje: borda `flame/55` e leve destaque; os demais permanecem discretos;
- card claro pode usar `shadow-sm`;
- hover em superfícies escuras: `carbon` → `slate`;
- separadores: 1 px com baixa opacidade;
- evitar sombras difusas grandes: elas enfraquecem a estética sólida e atlética.

### 4.8 Movimento

Transições presentes:

- cor e fundo: transição curta padrão (`transition-colors`);
- opacidade de CTA: `transition-opacity`;
- imagem do treino: escala até `1.03` em 500 ms no hover;
- barra de progresso: `transition-all`;
- skeleton: `animate-pulse`.

Regra: movimento confirma interação, não chama atenção sozinho. Na evolução do sistema, todas as animações devem respeitar `prefers-reduced-motion`.

## 5. Arquitetura de layout

### 5.1 Casca da aplicação

A classe raiz é `.aluno-app`.

- fundo da tela Hoje: `night`;
- texto padrão: branco;
- altura mínima: 100% da viewport;
- reserva inferior: 96 px (`pb-24`) para a navegação fixa;
- largura máxima do conteúdo: 448 px (`max-w-md`);
- centralização horizontal automática;
- padding horizontal interno: 20 px.

Em viewport maior que 448 px, a interface mantém o comportamento de um aplicativo mobile centralizado. Não esticar cards indefinidamente em desktop.

### 5.2 Cabeçalho institucional

O cabeçalho superior pertence à casca, não ao conteúdo da página.

- posição sticky no topo;
- fundo `night/90` com blur;
- borda inferior `steel`;
- `z-index: 10`;
- logo à esquerda com 24 px de altura;
- botão Sair à direita, compacto, em contorno;
- padding: 20 px horizontal e 14 px vertical.

O cabeçalho não deve receber saudações, filtros ou ações específicas de uma rota. Esses itens ficam no conteúdo.

### 5.3 Navegação inferior

- posição fixa no rodapé e largura total da viewport;
- superfície `carbon/95` com blur;
- borda superior `steel`;
- quatro destinos com larguras iguais: Hoje, Treino, Progresso e Perfil;
- label de 11 px;
- ícone de 20 px dentro de área visual de 36 × 36 px;
- estado ativo: ícone/texto `flame` e fundo `flame/15`;
- estado inativo: branco a 40%, chegando a 70% no hover.

A área clicável inclui ícone e label. A implementação futura deve acrescentar `padding-bottom: env(safe-area-inset-bottom)` para aparelhos com indicador de gesto.

### 5.4 Fluxo vertical da página Hoje

Ordem atual:

1. saudação e avatar;
2. faixa da semana;
3. progresso do programa;
4. atividade recente;
5. treinos;
6. acompanhamento;
7. resumo da ficha.

A sequência vai de contexto diário para execução, depois acompanhamento. Outras páginas devem preservar esse raciocínio: contexto antes dos detalhes, ação antes dos registros históricos.

## 6. Componentes de referência

### 6.1 Saudação personalizada

Composição:

- avatar circular 48 × 48 px em `flame`;
- inicial branca em Manrope;
- título de 18 px “Olá, {nome}” com truncamento;
- apoio de 14 px a 50% de branco;
- sino em alvo de 40 × 40 px;
- ponto laranja com anel do fundo quando existe pendência.

O ícone tem `aria-label` variável: “Você tem pendências” ou “Sem pendências”. Nunca comunicar pendência somente pela cor do ponto.

### 6.2 Faixa semanal

Sete itens de largura igual. Cada dia contém:

- abreviação de 11 px;
- número de 14 px;
- ponto de status de 4 × 4 px.

O dia atual usa bloco laranja arredondado e texto branco. Dias fora do estado atual permanecem sem superfície. O indicador pequeno pode representar treino concluído/previsto, mas precisa de legenda ou texto acessível quando essa semântica for relevante.

### 6.3 Card de progresso do programa

Usa o card base (`carbon`, raio 16, padding 20). Estrutura:

- rótulo “SEU PROGRAMA”;
- número principal “Dia X”;
- total “de 30” com menor contraste;
- porcentagem alinhada à direita;
- barra de 6 px com trilha `steel` e preenchimento `flame`;
- datas de início e término em 11 px.

Estados previstos: antes do início, em andamento, concluído e sem data definida. O texto deve mudar; não apenas a cor.

### 6.4 Cabeçalho de seção

- título Manrope 18 px;
- cor branca;
- ação textual opcional à direita, 12 px em `flame`;
- margem superior de 28 px;
- conteúdo começa 12 px depois.

Exemplo: “Seu treino” + “Ver programa”.

### 6.5 Card base escuro

Receita atual:

```text
fundo: carbon
raio: 16 px
padding: 20 px
texto principal: branco
texto secundário: branco 40–70%
borda: somente quando o estado exige
```

Ele deve ser o padrão para métricas, listas resumidas e informações de ficha. Não variar fundo ou raio sem função semântica.

### 6.6 Atividade recente

O bloco é dividido em um card largo e dois cards de métrica.

Card de treinos:

- cabeçalho com ícone laranja, label e chevron;
- número de treinos e minutos à esquerda;
- gráfico de sete barras à direita;
- altura da área do gráfico: 56 px;
- barras passadas em tom marrom-laranja e barra atual em `flame`;
- iniciais dos dias em 9 px.

Cards Frequência e Duração:

- grid de duas colunas com gap de 12 px;
- ícone de 16 px e label de 14 px;
- número de 20 px;
- anel de 56 × 56 px e traço de 6 px;
- apoio em 11 px.

Gráficos devem oferecer equivalente textual. O número e a legenda já cumprem parte dessa função; valores diários detalhados precisam de alternativa acessível se se tornarem interativos.

### 6.7 Estado de descanso

Quando não existe treino programado para o dia, um card compacto aparece antes do carrossel:

- ícone de lua em branco a 40%;
- mensagem em 14 px a 70%;
- próximo treino em branco a 40%.

O estado é informativo, não um erro. Não usar vermelho, alerta ou CTA agressivo.

### 6.8 Carrossel de treinos

Comportamento:

- rolagem horizontal;
- scrollbar nativa escondida por `.no-scrollbar`;
- sangria lateral de 20 px (`-mx-5`) com padding compensatório;
- gap de 12 px;
- indicador próprio abaixo, alinhado à direita;
- preenchimento do indicador calculado conforme o scroll.

Card:

- largura fixa: 240 px;
- altura mínima: 328 px;
- fundo: `#121212`;
- raio: 16 px;
- borda discreta; destaque laranja apenas no treino de hoje;
- imagem no topo com 176 px de altura;
- conteúdo inferior compacto, com padding de 16 px;
- CTA ancorado após o conteúdo com `margin-top: 16px`.

Imagem:

- ocupa toda a largura;
- `object-cover`;
- gradiente para `#121212` na base, garantindo continuidade e legibilidade;
- leve véu preto no topo;
- categoria em badge preto translúcido no canto superior esquerdo;
- treino de hoje carrega de forma eager; os demais, lazy;
- texto alternativo descreve o treino.

Conteúdo:

- rótulo superior de 11 px;
- título de 18 px em Manrope;
- uma bolinha `flame` de 6 px separa código e nome, substituindo travessões;
- metadados de 12 px com line-height relaxado;
- observação opcional em pílula escura de 10 px.

CTA:

- formato pílula, padding horizontal de 20 px e vertical de 8 px;
- treino de hoje: fundo `flame`, texto branco;
- qualquer outro treino: fundo branco, texto `ink`;
- nunca destacar dois treinos como “hoje” simultaneamente.

O indicador de rolagem mede 56 × 4 px, com trilha `steel` e preenchimento `flame`. Ele é decorativo (`aria-hidden`); a rolagem continua disponível por gesto, trackpad e teclado.

### 6.9 Card de anamnese

Card de ação/estado com gradiente de `flame` para `#C9410F`.

- raio 16 px;
- padding 20 px;
- título de 16 px;
- descrição de 14 px a 80%;
- conteúdo textual com truncamento quando necessário;
- quando concluída, ícone check dentro de círculo com 36 × 36 px;
- texto concluído: “Concluída - Toque para editar”.

Quando não concluída, o sistema atual usa um badge textual. Na normalização, manter diferença clara entre “pendente” e “concluída” por texto e ícone, não apenas por cor.

### 6.10 Card de check-in inverso

Este componente quebra intencionalmente a sequência escura para criar prioridade editorial.

- fundo branco;
- texto `ink`;
- raio 24 px;
- sombra pequena;
- cabeçalho de contexto em 11 px, caixa alta, `flame`;
- título em Manrope 24 px;
- explicação de 14 px em `ink/45`;
- contagem de dias em laranja, separada por divisória vertical;
- rodapé separado por borda `ink/10`.

Rodapé:

- ícones de 16 px dentro de círculos 32 × 32 px em `flame/10`;
- data em 12 px sem quebra de linha;
- orientação do WhatsApp em 12 px;
- separador vertical entre os dois blocos.

Não usar muitos cards brancos na mesma tela. Este tratamento é reservado ao próximo marco importante ou a uma tarefa que exija atenção especial.

### 6.11 Botão de WhatsApp

- largura total;
- fundo `carbon` e borda `steel`;
- raio 16 px;
- padding 16 px;
- texto branco semibold;
- ícone de conversa 20 px em `flame`;
- hover em `slate`.

O ícone de WhatsApp oficial dentro do check-in é diferente do ícone genérico de conversa usado no botão. Não substituir um pelo outro sem avaliar o contexto.

Links externos devem abrir com segurança e ter nome acessível explícito.

### 6.12 Resumo da ficha

Card base escuro com lista vertical de pares rótulo/valor:

- rótulo de 11 px em caixa alta a 40%;
- valor de 14 px branco;
- gap de 16 px;
- grafismo `line-fundo.svg` grande ao fundo;
- arte posicionada à direita, levemente deslocada para baixo;
- tamanho aproximado de 320 × 304 px;
- opacidade atual de 40%;
- conteúdo sempre acima da arte por `z-index`;
- card com `overflow-hidden`.

O SVG é estritamente decorativo: `alt=""`, `aria-hidden="true"` e sem eventos de ponteiro. Ao replicar, preservar legibilidade; a arte nunca deve cruzar textos com contraste insuficiente.

### 6.13 Player da sessão

O player usa a mesma identidade dark, porém sem a navegação inferior do aplicativo. Durante um treino, toda a hierarquia deve favorecer três respostas imediatas: qual exercício está aberto, qual série está ativa e qual é a próxima ação.

Cabeçalho:

- sticky, com fundo `night/95`, blur e borda `steel`;
- voltar equivale a pausar e preserva a execução aberta;
- título da sessão centralizado;
- progresso do exercício no formato `1 de 3` à direita;
- contagem global de séries aparece como informação secundária;
- barra inferior laranja representa a posição entre exercícios, não a série atual.

Apresentação do exercício:

- conteúdo diretamente sobre o fundo `night`, sem card claro;
- grupo muscular em rótulo laranja;
- nome em Manrope 24 px e descrição em branco atenuado;
- prescrição e parâmetros ficam exclusivamente no painel da série, evitando repetição no cabeçalho;
- a origem da biblioteca permanece implícita; somente conteúdos personalizados recebem a etiqueta “Seu coach”;
- observação e vídeo permanecem disponíveis quando existem;
- nenhum espaço de mídia aparece neste bloco.

Ritual de início:

- um exercício sem registros começa no estado “Pronto para começar”;
- as séries permanecem ocultas até uma ação intencional do aluno;
- o controle principal é circular, com 112 px, gradiente `flame` e ícone de play;
- dois anéis externos criam profundidade: um estático e outro segmentado em rotação lenta;
- o botão usa uma respiração sutil enquanto aguarda, sem competir com o conteúdo;
- no clique, o círculo comprime, retorna e libera duas ondas concêntricas em até 720 ms;
- o texto muda imediatamente para “Exercício iniciado” e depois revela o painel de séries;
- o painel entra com opacidade, deslocamento vertical de 18 px e leve correção de escala;
- o movimento respeita `prefers-reduced-motion`;
- se qualquer série já possui registro, o player entende como retomada e abre diretamente no estado ativo.

O ritual existe para marcar uma mudança de estado, não para atrasar o aluno. Ele não faz requisição, não altera o progresso e não é repetido ao retornar a um exercício já iniciado.

Série ativa:

- o painel principal usa cinza `carbon`;
- os três cards de Repetições, Carga e Descanso usam o cinza mais claro `slate`, mantendo profundidade entre os dois níveis;
- não usa badge textual de “EM ANDAMENTO”; o estado é comunicado diretamente pelo stepper;
- cabeçalho textual explícito: “Série atual” e `N de total`;
- stepper horizontal mostra todas as séries dentro do mesmo card;
- série concluída usa check e traço laranja;
- série ativa usa círculo laranja preenchido, label “AGORA” e um anel externo que expande e desaparece em pulso;
- o círculo ativo permanece imóvel e com tamanho constante durante a animação;
- séries futuras usam contorno cinza;
- todos os marcadores são botões, permitindo revisar ou corrigir registros sem recuperar a tabela antiga;
- ao selecionar outra série, número, campos e CTA mudam juntos;
- repetições e carga continuam editáveis apenas para a série selecionada;
- carga aceita entrada numérica decimal e mantém `kg` como sufixo visual fixo; a unidade também é persistida no valor salvo;
- descanso é somente leitura e informa que começa após a conclusão;
- cadência e RPE ficam abaixo das métricas;
- CTA sempre inclui o número: “Concluir série 2” ou “Salvar alterações da série 2”.

O stepper e o texto `N de total` são complementares: o desenho permite escanear o progresso e o texto elimina qualquer ambiguidade numérica.

Demonstração e execução rápida:

- aparecem depois do ritual/séries, nunca misturadas ao cabeçalho do exercício;
- a área branca começa recolhida com “Passo a passo”, “Aprenda a fazer” e a ação “Ver vídeo” acompanhada por ícone de play;
- o elemento `<img>` só é montado após o primeiro clique, impedindo download antecipado da mídia;
- ao abrir, o painel anima sua altura e opacidade; a mídia entra com fade, deslocamento de 10 px e leve correção de escala;
- depois do primeiro carregamento, fechar apenas recolhe a área e mantém a mídia disponível em cache;
- imagem ou GIF usa fundo branco, `object-contain` e 288 px de altura para preservar todos os frames;
- a mídia e as orientações formam um único componente de raio 24 px;
- o bloco `carbon` de “Execução rápida” se conecta à base da mídia com cantos superiores arredondados;
- orientações usam bolinhas `flame` e texto branco atenuado;
- o link expansível “Passo a passo completo” não faz parte desta composição;
- sem imagem, o mesmo componente reduz-se naturalmente ao card escuro de orientações;
- sem orientações, a demonstração continua visível quando houver mídia.

Descanso:

- não usa modal, overlay ou painel fixo;
- ao concluir uma série, substitui todo o conteúdo operacional do próprio card de séries, preservando sua posição na página;
- fundo `carbon`, contador branco e anel circular `flame` para o progresso do tempo;
- informa explicitamente “Próxima: série 3 de 4” ou o nome do próximo exercício;
- preserva ajuste de ±15 segundos, pausa, retomada e pular descanso;
- ao terminar ou pular, o mesmo card retorna para a próxima série ativa;
- a entrada usa fade, leve deslocamento vertical e correção de escala, sempre respeitando movimento reduzido.

Ordem dos conteúdos durante a sessão:

1. exercício;
2. ritual de início, apenas quando ainda não existe registro;
3. série ativa, depois que o exercício começa;
4. demonstração visual + execução rápida;
5. erro comum e segurança;
6. alternativa;
7. orientação personalizada e motivo no plano;
8. mapa muscular;
9. navegação entre exercícios.

Blocos inexistentes nos dados não deixam espaços vazios. O player deve preservar toda orientação recebida, ainda que a informação menos operacional apareça depois da série ativa.

Navegação final:

- botão anterior em superfície escura e contorno discreto;
- próximo exercício ou finalizar em `flame`;
- ação “Encerrar treino agora” permanece terciária e sublinhada;
- a tela de avaliação final reutiliza o card `carbon`, inputs dark e CTA laranja.

## 7. Ícones e imagens

### 7.1 Iconografia

O sistema usa SVGs lineares, com `currentColor`, cantos/terminações consistentes e pouca complexidade.

Tamanhos:

- 16 px: metadados e cabeçalhos de métricas;
- 20 px: ações e navegação;
- 36 px: confirmação principal, como anamnese concluída;
- 40 px: alvo de toque mínimo dos controles do cabeçalho;
- 48 px: avatar.

Regras:

- não usar emoji como ícone de interface;
- ícones decorativos recebem `aria-hidden`;
- botões somente com ícone recebem `aria-label`;
- status importante combina ícone e texto;
- cor segue a hierarquia do conteúdo, não a categoria do desenho.

### 7.2 Fotografia de treino

Direção de arte atual:

- academia escura;
- iluminação dramática e quente;
- equipamentos e atleta com contraste controlado;
- preto e laranja coerentes com a interface;
- enquadramento que continue legível em recorte vertical de 240 × 176 px.

Evitar imagens claras, fundos clínicos, saturação excessiva ou estilos visuais diferentes entre exercícios do mesmo carrossel.

## 8. Botões, links e prioridade de ação

### Níveis

1. **Primário:** fundo `flame`, texto branco. Uma ação dominante por contexto.
2. **Secundário inverso:** fundo branco, texto `ink`. Usado nos treinos que não são o treino de hoje.
3. **Secundário escuro:** fundo `carbon`, borda `steel`, texto branco. Exemplo: WhatsApp.
4. **Terciário:** link textual `flame`. Exemplo: “Ver programa”.
5. **Discreto:** botão em contorno com texto atenuado. Exemplo: “Sair”.

### Estados mínimos

Todos os controles devem prever:

- default;
- hover, quando existir ponteiro;
- foco visível por teclado;
- active/pressed;
- disabled com texto ainda legível;
- loading quando a ação for assíncrona.

A tela atual cobre principalmente default e hover. Foco, disabled e loading precisam ser normalizados na replicação.

## 9. Estados de dados

### 9.1 Carregamento

O skeleton atual usa blocos `carbon`, raios de 16 px e pulso. Ele deve aproximar o volume do conteúdo final para evitar saltos de layout.

Não misturar skeleton claro em página dark.

### 9.2 Sem vínculo ou sem conteúdo

- título Manrope 24 px;
- mensagem centralizada de 14 px com largura limitada;
- linguagem acolhedora (“Quase lá!”), sem tom de falha;
- orientação sobre o próximo passo.

Estados vazios específicos, como dia de descanso, devem permanecer no contexto da seção em vez de substituir toda a página.

### 9.3 Erro

O componente compartilhado `DataState` ainda está acoplado ao tema claro. Antes de reutilizá-lo nas páginas dark, criar variante visual que use:

- fundo `carbon`;
- texto branco;
- mensagem secundária a 50–60%;
- ação `flame`;
- ícone ou título que não dependa apenas de cor.

### 9.4 Sucesso e conclusão

Sucesso é comunicado com check circular e texto explícito. O laranja continua sendo a cor de marca e não deve ser interpretado sozinho como sucesso sem legenda.

## 10. Conteúdo e tom de voz

- português do Brasil;
- frases curtas, humanas e orientadas à ação;
- títulos em sentence case;
- evitar jargão técnico de treino quando ele não ajuda a decisão;
- usar números com unidade próxima: `130 min`, `3 exercícios`, `13 dias`;
- usar til para estimativas: `~55 min`;
- status devem dizer o que aconteceu e o próximo passo;
- CTA começa com verbo: “Iniciar”, “Ver programa”, “Falar com Coach”.

Textos consolidados:

- “Concluída - Toque para editar”;
- “Hoje é dia de recuperar — sem treino programado.”;
- “Combine pelo WhatsApp”;
- “Falar com Coach no WhatsApp”.

Usar hífen simples em textos do produto quando necessário para manter compatibilidade com a redação atual; a bolinha laranja é um elemento visual reservado à separação do título dos treinos.

## 11. Responsividade

### Faixa principal

- projeto otimizado para 320–448 px de conteúdo;
- em telas maiores, manter a coluna central de até 448 px;
- em telas estreitas, o padding de 20 px permanece enquanto não causar quebra crítica;
- carrosséis mantêm cards de 240 px para revelar parte do próximo item e sugerir rolagem.

### Regras de adaptação

- a grade de métricas pode permanecer em duas colunas até a largura mínima em que número, anel e label caibam sem sobreposição;
- abaixo disso, reduzir primeiro os gaps internos ou empilhar os cards; não reduzir texto abaixo da escala definida;
- textos dinâmicos de nome e status devem usar `min-w-0`, truncamento ou quebra controlada;
- o check-in deve preservar a coluna de contagem, mas pode empilhar o rodapé se os textos colidirem;
- respeitar zoom do usuário e texto ampliado;
- não depender de hover para revelar conteúdo.

## 12. Acessibilidade

Requisitos para toda nova página:

- contraste mínimo WCAG AA para texto funcional;
- foco de teclado visível em todos os links e botões;
- alvo de toque preferencial de pelo menos 44 × 44 px;
- hierarquia de headings sem saltos arbitrários;
- `aria-label` em ações somente com ícone;
- texto alternativo significativo nas fotos dos exercícios;
- imagens decorativas com `alt=""` e `aria-hidden`;
- estados nunca comunicados apenas por cor;
- gráficos acompanhados por números e descrições;
- rolagem horizontal acessível por teclado;
- respeito a `prefers-reduced-motion`;
- suporte a safe areas superior e inferior;
- idioma do documento mantido como `pt-BR`.

Pendências observadas: alguns textos a 30–35% de branco precisam de validação de contraste, e os estados de foco ainda não estão sistematizados.

## 13. Padrões que não devem ser replicados

- usar o laranja em todos os botões, diluindo a ação prioritária;
- clarear os cards com gradiente cinza sem função;
- misturar terracota do tema legado com `flame` na mesma área dark;
- variar arbitrariamente os raios entre cards equivalentes;
- usar badges quando um ícone de status grande comunica melhor;
- colocar conteúdo sobre o SVG decorativo sem controle de contraste;
- esconder informação exclusivamente atrás de hover;
- criar cards de treino largos demais a ponto de perder o caráter vertical;
- aumentar a altura do conteúdo inferior quando a imagem deve ser protagonista;
- usar travessão como ornamento entre código e nome do treino;
- centralizar o indicador do carrossel quando ele pertence ao fluxo da borda direita;
- importar diretamente os componentes claros atuais para fundo escuro sem variante.

## 14. Especificação de composição por página

Cada nova página dark deve seguir esta receita:

1. entrar na casca `.aluno-app` e no mesmo fundo `night`;
2. conservar header sticky e bottom navigation;
3. começar com título/contexto específico da rota;
4. separar seções por 28 px;
5. usar `carbon` como superfície padrão;
6. reservar branco para texto principal e, no máximo, um card inverso editorial;
7. escolher uma única ação primária laranja por contexto;
8. aplicar os mesmos estados de loading, vazio, erro e sucesso;
9. testar em 320, 375, 390 e 448 px;
10. testar com conteúdo real longo, teclado, zoom e safe area.

## 15. Contrato de migração das rotas existentes

### 15.1 Casca e roteamento

Hoje, `AlunoLayout` ativa dark apenas quando o pathname é exatamente `/aluno`. Para completar a identidade, substituir essa exceção por uma regra válida para toda a área do aluno ou remover a bifurcação claro/escuro depois que todas as rotas forem convertidas.

Rotas que exigem revisão:

- `/aluno/treino`;
- `/aluno/progresso`;
- `/aluno/anamnese`;
- estados intermediários e telas sem dados dessas rotas.

O player `/aluno/treino/sessao/:sessaoId` já aplica o sistema dark. Ele deve continuar sendo validado junto às mudanças das telas que o antecedem.

`/aluno/anamnese` e o player não passam pela mesma casca em todos os fluxos. No player isso é intencional: a navegação inferior não aparece durante o treino, mas fundo, tipografia, header de retorno e tokens são compartilhados.

### 15.2 Componentes a tematizar

- `DataState`: criar variante dark;
- `TreinoView`: converter superfícies, textos, botões e estados;
- `AnamneseCampos`: converter inputs, labels, mensagens e foco;
- `TreinoPlayer`: manter o padrão dark consolidado e reutilizar suas primitivas nas evoluções do fluxo;
- páginas Treino e Progresso: aplicar cards e cabeçalhos deste documento;
- `LogoutButton` e `Logo`: manter APIs de cor por `currentColor`/classe.

### 15.3 Tokens a normalizar

Antes de espalhar o padrão, é recomendado:

- criar token para o `#121212` dos cards de treino;
- criar token para o vermelho-laranja `#C9410F` do gradiente;
- mover receitas `CARD` e `ROTULO` de `HojePage.tsx` para abstração compartilhada quando houver pelo menos duas páginas consumidoras;
- criar variantes compartilhadas de botão, card e label, sem montar strings diferentes em cada tela;
- definir estilos de foco, disabled e loading;
- adicionar utilitário para safe area e movimento reduzido.

Evitar abstração prematura de componentes muito específicos. Primeiro compartilhar tokens e primitivas; depois extrair componentes quando a segunda página provar o padrão.

### 15.4 Navegador e PWA

`index.html` e `public/manifest.webmanifest` ainda declaram `#F0EDE6` como `theme-color` e `background_color`. Quando a área dark se tornar o padrão do aluno:

- avaliar `#0F0F0F` como cor de tema nas rotas do aluno;
- usar meta theme-color dinâmica se coach e aluno continuarem com temas diferentes;
- revisar splash/background do PWA;
- confirmar que a barra do navegador não cria uma faixa clara acima do app.

## 16. Checklist de implementação

### Visual

- [ ] fundo `night` e coluna de no máximo 448 px;
- [ ] tipografia Manrope nos títulos e Plus Jakarta Sans no corpo;
- [ ] seção separada por 28 px;
- [ ] cards padrão com raio de 16 px e padding de 20 px;
- [ ] hierarquia de branco/opacidade consistente;
- [ ] laranja reservado à seleção, progresso e ação prioritária;
- [ ] imagens coerentes com a direção fotográfica;
- [ ] nenhum cinza claro ou terracota legado introduzido sem intenção.

### Comportamento

- [ ] header sticky e navegação inferior sem cobrir conteúdo;
- [ ] safe area considerada;
- [ ] hover, foco, pressed, disabled e loading definidos;
- [ ] carrossel utilizável por toque, trackpad e teclado;
- [ ] estados de loading, vazio, erro e conclusão cobertos;
- [ ] movimento reduzido respeitado.

### Conteúdo e acessibilidade

- [ ] headings em ordem;
- [ ] ícones com semântica correta;
- [ ] status acompanhado de texto;
- [ ] imagens com `alt` adequado;
- [ ] contraste AA validado;
- [ ] alvos de toque adequados;
- [ ] textos testados com nomes e valores longos;
- [ ] zoom e viewport de 320 px testados.

## 17. Critérios de aceite para a replicação

Uma página pode ser considerada aderente quando:

1. parece pertencer ao mesmo aplicativo mesmo sem o logotipo visível;
2. mantém a hierarquia escura/carbono/laranja sem competir por atenção;
3. utiliza os mesmos ritmos de 12, 16, 20 e 28 px;
4. preserva a escala tipográfica e o uso das duas fontes;
5. funciona de 320 a 448 px e continua centralizada acima disso;
6. oferece estados completos de interação e dados;
7. não depende de cor, hover ou imagem para transmitir informação essencial;
8. não reintroduz decisões do tema claro por acidente;
9. passa por revisão visual no navegador com dados reais;
10. reutiliza tokens e primitivas em vez de duplicar valores soltos.

## 18. Dívida técnica e decisões pendentes

- o tema dark é ativado por igualdade de pathname e ainda não cobre toda a área;
- `#121212` e `#C9410F` estão hardcoded;
- `CARD` e `ROTULO` são constantes locais da tela Hoje;
- `DataState` está acoplado ao tema claro;
- a rota de anamnese não compartilha integralmente a casca; o player usa uma casca própria por decisão de foco;
- foco de teclado não possui receita visual única;
- não há regra explícita de `prefers-reduced-motion`;
- bottom nav ainda não usa safe area;
- `theme-color` e cores do manifest continuam claras;
- opacidades de 30–35% precisam de auditoria formal de contraste;
- o indicador visual do carrossel é decorativo e não informa posição numericamente a tecnologias assistivas;
- as fontes dependem do Google Fonts e devem ter estratégia de fallback/cache para experiência PWA consistente.

Esses itens não invalidam o sistema atual; são o backlog recomendado para transformar o estudo visual da tela Hoje em uma fundação estável para todo o produto.
