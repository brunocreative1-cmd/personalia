// Seed da biblioteca de exercícios — catálogo curado e aprovado pelo coach
// Willian Sousa (CREF 2904-G/GO). Conteúdo de trabalho dele, não biblioteca
// inventada. IDEMPOTENTE: verifica por nome e pula os que já existem.
// Uso: node scripts/seed-exercicios.mjs
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(path.join(ROOT, ".env.backup"), "utf8").replace(/^﻿/, "");
const url = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL=")).slice("DATABASE_URL=".length).trim();

const COACH = "bab283a5-480d-41d5-b1b2-7a3ae9000ebd"; // Willian Sousa

// [nome, grupo, equipamento, dificuldade, descricao, instrucoes, seguranca]
const EXERCICIOS = [
  // ------------------------------- PEITO ----------------------------------
  ["Supino inclinado com halteres", "peito", "Halteres e banco inclinado", "intermediario",
    "Supino no banco inclinado que enfatiza a porção superior do peitoral, com amplitude maior que a barra.",
    "1. Ajuste o banco entre 30–45° e deite com um halter em cada mão na linha do peito.\n2. Pés firmes no chão e escápulas retraídas.\n3. Expire empurrando os halteres para cima até quase se tocarem, sem travar os cotovelos.\n4. Inspire descendo com controle até a linha do peito.",
    "Peça ajuda para posicionar halteres pesados — não os jogue para trás ao terminar. Inclinação acima de 45° transfere o trabalho para o ombro."],
  ["Supino reto com barra", "peito", "Barra e banco", "intermediario",
    "Exercício base para o peitoral, com participação de ombros e tríceps.",
    "1. Deite no banco com os pés firmes no chão e as escápulas retraídas.\n2. Segure a barra com pegada um pouco mais aberta que os ombros.\n3. Inspire e desça a barra controlando até a linha do peito.\n4. Expire empurrando a barra para cima até estender os cotovelos, sem travar.",
    "Use sempre os apoios de segurança ou um parceiro em cargas altas. Não rebata a barra no peito nem tire os glúteos do banco."],
  ["Crucifixo com halteres", "peito", "Halteres e banco", "iniciante",
    "Isola o peitoral com movimento de abertura, ótimo para complementar os supinos.",
    "1. Deite no banco com um halter em cada mão, braços estendidos acima do peito e cotovelos levemente flexionados.\n2. Inspire abrindo os braços em arco até sentir alongar o peitoral.\n3. Expire fechando o arco até os halteres quase se tocarem.",
    "Não desça além do conforto do ombro. Mantenha os cotovelos levemente dobrados o tempo todo — braço reto sobrecarrega a articulação."],
  ["Flexão de braço", "peito", "Peso corporal", "iniciante",
    "Clássico com o peso do corpo para peito, ombros, tríceps e core.",
    "1. Apoie mãos no chão na largura dos ombros e pontas dos pés no chão, corpo em linha reta.\n2. Inspire descendo o peito em direção ao chão com os cotovelos a ~45°.\n3. Expire empurrando o chão até estender os braços.\n4. Se precisar, apoie os joelhos para facilitar.",
    "Não deixe o quadril cair nem empinar — abdômen firme. Se sentir dor no punho, use apoios ou feche as mãos."],
  ["Crossover na polia", "peito", "Polia dupla", "intermediario",
    "Finalizador de peito com tensão contínua, cruzando os cabos à frente do corpo.",
    "1. Ajuste as polias acima da linha do ombro e segure uma manopla em cada mão.\n2. Dê um passo à frente com o tronco levemente inclinado.\n3. Expire trazendo as mãos em arco até se cruzarem à frente do peito.\n4. Inspire voltando devagar até sentir o alongamento.",
    "Controle a volta — não deixe o peso puxar seu ombro para trás de forma brusca."],
  // ------------------------------- COSTAS ---------------------------------
  ["Remada cavalinho (barra T)", "costas", "Barra T / landmine", "intermediario",
    "Remada apoiada na barra T que constrói espessura no meio das costas com boa estabilidade.",
    "1. Posicione-se sobre a barra com os pés na largura dos ombros e segure o pegador com as duas mãos.\n2. Incline o tronco a ~45° com a coluna neutra e joelhos semiflexionados.\n3. Expire puxando a barra em direção ao abdômen, apertando as escápulas no topo.\n4. Inspire descendo com controle até estender os braços.",
    "A coluna não arredonda em nenhum momento — se arredondar, reduza a carga. Não use impulso de tronco para subir o peso."],
  ["Puxada frontal na polia", "costas", "Polia alta", "iniciante",
    "Constrói a largura das costas puxando a barra até a parte alta do peito.",
    "1. Sente com as coxas travadas no apoio e segure a barra com pegada aberta.\n2. Expire puxando a barra até a parte alta do peito, levando os cotovelos para baixo e para trás.\n3. Inspire subindo a barra com controle até estender os braços.",
    "Não puxe a barra atrás da nuca nem use impulso do tronco. O movimento nasce nas costas, não nos braços."],
  ["Barra fixa", "costas", "Barra fixa", "avancado",
    "O exercício mais completo de puxada vertical, com o peso do próprio corpo.",
    "1. Segure a barra com pegada pronada, um pouco mais aberta que os ombros.\n2. Expire puxando o corpo até o queixo passar da barra, peito em direção à barra.\n3. Inspire descendo com controle até quase estender os cotovelos.\n4. Use elástico de assistência ou graviton se ainda não completar repetições.",
    "Evite balançar o corpo (kipping) em treino de força. Desça controlado — soltar o corpo de uma vez estressa ombros e cotovelos."],
  ["Remada curvada com barra", "costas", "Barra", "intermediario",
    "Remada pesada para espessura das costas, com o tronco inclinado.",
    "1. Segure a barra com pegada pronada, incline o tronco a ~45° com a coluna neutra e joelhos semiflexionados.\n2. Expire puxando a barra em direção ao abdômen, cotovelos junto ao corpo.\n3. Inspire descendo a barra com controle até estender os braços.",
    "A coluna neutra é inegociável — se a lombar arredondar, reduza a carga. Não erga o tronco para ajudar a puxada."],
  ["Remada unilateral com halter (serrote)", "costas", "Halter e banco", "iniciante",
    "Remada de um braço apoiado no banco, ótima para corrigir assimetrias.",
    "1. Apoie joelho e mão do mesmo lado no banco; o outro pé fica no chão.\n2. Segure o halter com o braço estendido e a coluna neutra.\n3. Expire puxando o halter até a linha do quadril, cotovelo rente ao corpo.\n4. Inspire descendo devagar até o alongamento completo.",
    "Não gire o tronco para levantar mais carga. O ombro desce e sobe junto do movimento — sem encolher o pescoço."],
  ["Pulldown com braços estendidos", "costas", "Polia alta", "intermediario",
    "Isola o latíssimo levando a barra do alto até a coxa com os braços quase retos.",
    "1. Em pé, segure a barra da polia alta com braços estendidos na altura dos ombros.\n2. Expire levando a barra em arco até encostar na coxa, cotovelos quase retos.\n3. Inspire subindo com controle até a altura inicial.",
    "Quem manda é o dorsal, não o tríceps: cotovelos travados em leve flexão. Tronco firme, sem balanço."],
  // ------------------------------- PERNAS ---------------------------------
  ["Agachamento livre", "pernas", "Barra", "intermediario",
    "O rei dos exercícios de perna: agachamento com barra nas costas para quadríceps, glúteos e core.",
    "1. Posicione a barra no trapézio (não no pescoço) e saia do suporte com 2 passos.\n2. Pés na largura dos ombros, pontas levemente para fora.\n3. Inspire descendo o quadril para trás e para baixo até pelo menos a coxa paralela ao chão, joelhos na direção dos pés.\n4. Expire subindo com força pelos calcanhares até a extensão completa.",
    "Agache sempre dentro do rack com as barras de segurança ajustadas. Coluna neutra e calcanhar no chão do início ao fim; se o calcanhar levanta, reduza a profundidade e trabalhe mobilidade."],
  ["Leg press", "pernas", "Leg press", "iniciante",
    "Empurra a plataforma com segurança para quadríceps e glúteos, sem exigir equilíbrio.",
    "1. Sente com a lombar bem apoiada e os pés na plataforma na largura dos ombros.\n2. Inspire descendo a plataforma até ~90° de joelho, sem tirar a lombar do encosto.\n3. Expire empurrando de volta, sem travar os joelhos no final.",
    "Nunca destrave os joelhos por completo no topo nem desça além do ponto em que a lombar descola do banco."],
  ["Afundo (avanço)", "pernas", "Halteres ou peso corporal", "iniciante",
    "Passada à frente que trabalha quadríceps, glúteos e equilíbrio.",
    "1. Em pé, dê um passo à frente mantendo o tronco ereto.\n2. Inspire descendo até os dois joelhos formarem ~90°, joelho de trás quase tocando o chão.\n3. Expire empurrando o chão com a perna da frente para voltar à posição inicial.\n4. Alterne as pernas.",
    "O joelho da frente aponta para o pé, sem cair para dentro. Passos curtos demais jogam a pressão no joelho — dê um passo amplo."],
  ["Agachamento búlgaro", "pernas", "Halteres e banco", "intermediario",
    "Agachamento unilateral com o pé de trás elevado — intenso para quadríceps e glúteos.",
    "1. Apoie o peito do pé de trás no banco e afaste o pé da frente ~1 passo.\n2. Inspire descendo o joelho de trás em direção ao chão, tronco levemente inclinado à frente.\n3. Expire subindo pela perna da frente.\n4. Complete as repetições e troque de perna.",
    "Comece sem carga até dominar o equilíbrio. Dor na frente do joelho = afaste mais o pé da frente."],
  ["Cadeira extensora", "pernas", "Máquina", "iniciante",
    "Isola o quadríceps com apoio total do corpo na máquina.",
    "1. Ajuste o encosto para o joelho alinhar com o eixo da máquina e o rolo ficar no tornozelo.\n2. Expire estendendo as pernas até quase retas.\n3. Inspire descendo com controle, sem deixar o peso bater.",
    "Não estenda com impulso ('chutar'). Amplitude dolorosa no início? Reduza o arco e a carga."],
  ["Elevação pélvica (hip thrust)", "gluteos", "Barra e banco", "intermediario",
    "O exercício mais direto para força e desenvolvimento dos glúteos.",
    "1. Apoie as escápulas no banco, pés no chão na largura do quadril e a barra sobre o quadril (use proteção).\n2. Expire subindo o quadril até o tronco ficar paralelo ao chão, contraindo forte o glúteo no topo.\n3. Inspire descendo o quadril com controle, sem relaxar no chão.",
    "Queixo levemente recolhido e costelas fechadas no topo — quem sobe é o quadril, não a lombar em arco."],
  // --------------------------- POSTERIORES --------------------------------
  ["Stiff com halteres", "posteriores de coxa", "Halteres", "intermediario",
    "Dobradiça de quadril com pernas quase estendidas, alongando posteriores e glúteos.",
    "1. Em pé, halteres à frente das coxas, joelhos semiflexionados.\n2. Inspire empurrando o quadril para trás e descendo os halteres rente às pernas, coluna neutra.\n3. Desça até sentir alongar o posterior (sem arredondar as costas).\n4. Expire subindo pelo quadril, contraindo o glúteo no topo.",
    "O limite da descida é o alongamento do posterior, não o chão. Coluna arredondou = pare e reduza a amplitude."],
  ["Mesa flexora", "posteriores de coxa", "Máquina", "iniciante",
    "Isola os posteriores de coxa flexionando os joelhos deitado na máquina.",
    "1. Deite de bruços com o rolo atrás dos tornozelos e o quadril colado no banco.\n2. Expire flexionando os joelhos, trazendo o rolo em direção aos glúteos.\n3. Inspire estendendo devagar, sem deixar o peso bater.",
    "Quadril não levanta do banco durante a flexão. Evite estender 100% de forma brusca no final."],
  ["Levantamento terra romeno", "posteriores de coxa", "Barra", "avancado",
    "Versão com barra da dobradiça de quadril — força para posteriores, glúteos e lombar.",
    "1. Em pé, segure a barra à frente das coxas com pegada firme.\n2. Inspire empurrando o quadril para trás, barra deslizando rente às pernas, coluna neutra.\n3. Desça até a canela ou o limite da mobilidade sem arredondar as costas.\n4. Expire subindo pelo quadril até a extensão completa, sem hiperestender a lombar.",
    "Exercício técnico: aprenda com carga leve. Coluna neutra do início ao fim; a barra viaja colada no corpo."],
  // ------------------------------- OMBROS ---------------------------------
  ["Desenvolvimento com halteres", "ombros", "Halteres", "intermediario",
    "Empurra os halteres acima da cabeça — base de força para os ombros.",
    "1. Sentado ou em pé, halteres na altura das orelhas, palmas para frente.\n2. Expire empurrando os halteres para cima até quase se tocarem, sem travar os cotovelos.\n3. Inspire descendo com controle até a altura das orelhas.",
    "Costelas fechadas e abdômen firme — não arqueie a lombar para empurrar. Em pé, evite impulso de pernas."],
  ["Elevação lateral", "ombros", "Halteres", "iniciante",
    "Isola a porção lateral do deltoide, dando largura aos ombros.",
    "1. Em pé, halteres ao lado do corpo, cotovelos levemente flexionados.\n2. Expire elevando os braços pelos lados até a altura dos ombros.\n3. Inspire descendo devagar, resistindo à volta.",
    "Carga leve e técnica limpa: subir além da linha do ombro ou balançar o tronco tira o estímulo e irrita o ombro."],
  ["Elevação frontal", "ombros", "Halteres", "iniciante",
    "Trabalha a porção anterior do deltoide elevando o halter à frente do corpo.",
    "1. Em pé, halteres à frente das coxas, palmas para baixo.\n2. Expire elevando um ou os dois braços à frente até a altura do ombro.\n3. Inspire descendo com controle.",
    "Sem balanço de tronco. Se já faz muitos supinos e desenvolvimentos, use com moderação — o deltoide anterior já trabalha neles."],
  ["Crucifixo inverso", "ombros", "Halteres ou máquina", "iniciante",
    "Fortalece a parte posterior do ombro e a região entre as escápulas — essencial para a postura.",
    "1. Incline o tronco à frente (ou use o peck deck invertido) com halteres pendurados.\n2. Expire abrindo os braços para os lados até a linha dos ombros, apertando as escápulas.\n3. Inspire fechando devagar.",
    "Movimento curto e controlado — carga alta aqui vira balanço. Pescoço relaxado."],
  // ------------------------------- BÍCEPS ---------------------------------
  ["Rosca direta com barra", "biceps", "Barra", "iniciante",
    "O construtor clássico de bíceps, com as duas mãos na barra.",
    "1. Em pé, segure a barra com pegada supinada na largura dos ombros, cotovelos junto ao tronco.\n2. Expire flexionando os cotovelos até a barra chegar perto do peito.\n3. Inspire descendo com controle até estender os braços.",
    "Cotovelos fixos ao lado do corpo — se eles avançam ou o tronco balança, a carga está alta."],
  ["Rosca alternada com halteres", "biceps", "Halteres", "iniciante",
    "Rosca de um braço por vez com giro do punho, pegando bíceps por inteiro.",
    "1. Em pé ou sentado, halteres ao lado do corpo com palmas para dentro.\n2. Expire subindo um halter girando a palma para cima durante a subida.\n3. Inspire descendo com controle e repita com o outro braço.",
    "Sem impulso de ombro ou tronco. O giro do punho acontece no meio da subida, não no final."],
  ["Rosca martelo", "biceps", "Halteres", "iniciante",
    "Rosca com pegada neutra que fortalece bíceps, braquial e antebraço.",
    "1. Em pé, halteres ao lado do corpo com palmas voltadas uma para a outra.\n2. Expire flexionando os cotovelos mantendo a pegada neutra (posição de martelo).\n3. Inspire descendo devagar até estender.",
    "Punho firme e alinhado ao antebraço. Evite 'chicotear' o halter no final da subida."],
  // ------------------------------- TRÍCEPS --------------------------------
  ["Tríceps na polia (corda)", "triceps", "Polia e corda", "iniciante",
    "Extensão de cotovelo na polia com corda — o tríceps trabalha em tensão contínua.",
    "1. Em pé, segure a corda na polia alta com os cotovelos colados no tronco.\n2. Expire estendendo os braços para baixo, afastando as pontas da corda no final.\n3. Inspire subindo com controle até ~90° de cotovelo.",
    "Cotovelos são a dobradiça: eles não saem do lugar. Tronco levemente inclinado, sem debruçar sobre o peso."],
  ["Tríceps francês", "triceps", "Halter", "intermediario",
    "Extensão acima da cabeça que alonga e trabalha a cabeça longa do tríceps.",
    "1. Sentado ou em pé, segure um halter com as duas mãos acima da cabeça.\n2. Inspire descendo o halter atrás da cabeça flexionando os cotovelos.\n3. Expire estendendo os braços de volta ao alto.",
    "Cotovelos apontando para frente, perto das orelhas. Cuidado com a nuca na descida — movimento controlado, sem pressa."],
  ["Mergulho no banco", "triceps", "Banco", "iniciante",
    "Flexão de cotovelos com as mãos apoiadas no banco atrás do corpo.",
    "1. Apoie as mãos na borda do banco atrás de você, pernas estendidas ou flexionadas à frente.\n2. Inspire descendo o quadril flexionando os cotovelos até ~90°.\n3. Expire empurrando o banco até estender os braços.",
    "Ombros longe das orelhas e costas rente ao banco. Desconforto no ombro = reduza a amplitude ou troque pela polia."],
  // -------------------------------- CORE ----------------------------------
  ["Prancha", "core", "Peso corporal", "iniciante",
    "Isometria fundamental de estabilização do tronco.",
    "1. Apoie antebraços e pontas dos pés no chão, cotovelos sob os ombros.\n2. Alinhe cabeça, tronco e quadril em linha reta, abdômen e glúteos firmes.\n3. Respire normalmente e sustente pelo tempo combinado.",
    "Quadril caindo ou subindo = fim da série, mesmo antes do tempo. Qualidade vale mais que segundos."],
  ["Prancha lateral", "core", "Peso corporal", "iniciante",
    "Isometria que fortalece os oblíquos e a estabilidade lateral do tronco.",
    "1. Deite de lado e apoie o antebraço no chão, cotovelo sob o ombro.\n2. Eleve o quadril até o corpo formar uma linha reta dos pés à cabeça.\n3. Respire normalmente, sustente o tempo combinado e troque de lado.",
    "Não deixe o quadril ceder para o chão. Versão mais fácil: joelhos apoiados."],
  ["Abdominal infra", "core", "Solo ou paralela", "intermediario",
    "Elevação de pernas com ênfase na porção inferior do abdômen.",
    "1. Deitado (ou suspenso na paralela), pernas estendidas ou semiflexionadas.\n2. Expire elevando as pernas e tirando levemente o quadril do apoio no final.\n3. Inspire descendo devagar sem tocar os pés no chão.",
    "Lombar pressionada contra o solo o tempo todo (no chão, mãos sob o quadril ajudam). Balanço rouba o estímulo."],
  ["Dead bug", "core", "Peso corporal", "iniciante",
    "Coordenação de braços e pernas opostos com a lombar estável — core profundo.",
    "1. Deite de costas com braços estendidos para o teto e joelhos a 90°.\n2. Expire estendendo perna direita e braço esquerdo em direção ao chão, sem encostar.\n3. Inspire voltando ao centro e repita com o lado oposto.",
    "A lombar não sai do chão em nenhum momento — se sair, diminua a amplitude. Ritmo lento e consciente."],
  ["Pallof press", "core", "Polia", "intermediario",
    "Anti-rotação: empurrar o cabo à frente enquanto o tronco resiste ao giro.",
    "1. De lado para a polia (altura do peito), segure a manopla com as duas mãos junto ao peito.\n2. Expire estendendo os braços à frente, resistindo à rotação do tronco.\n3. Inspire trazendo as mãos de volta ao peito. Complete e troque de lado.",
    "Quadril e ombros apontando sempre para frente. Se o tronco gira, reduza a carga."],
  // ------------------------------- CARDIO ---------------------------------
  ["Esteira caminhada inclinada", "cardio", "Esteira", "iniciante",
    "Caminhada em inclinação para condicionamento com baixo impacto.",
    "1. Ajuste a inclinação (6–12%) e uma velocidade que permita conversar com esforço.\n2. Caminhe ereto, passos naturais, braços soltos.\n3. Mantenha o tempo combinado respirando de forma ritmada.",
    "Evite segurar no apoio o tempo todo — reduz o trabalho e prejudica a postura. Hidrate-se."],
  ["Bike ergométrica", "cardio", "Bike", "iniciante",
    "Pedalada estacionária para condicionamento cardiovascular sem impacto.",
    "1. Ajuste o banco na altura do quadril (joelho quase estendido no ponto baixo do pedal).\n2. Pedale em cadência constante na resistência combinada.\n3. Respire de forma ritmada durante todo o tempo previsto.",
    "Joelhos alinhados com os pés, sem abrir para fora. Dor no joelho geralmente é banco baixo demais."],
];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows: existentes } = await client.query(`SELECT nome FROM public.exercicios`);
const nomesExistentes = new Set(existentes.map((r) => r.nome.trim().toLowerCase()));

let inseridos = 0;
let pulados = 0;
let erros = 0;

for (const [nome, grupo, equipamento, dificuldade, descricao, instrucoes, seguranca] of EXERCICIOS) {
  if (nomesExistentes.has(nome.trim().toLowerCase())) {
    pulados++;
    console.log(`  pulado  ${nome} (já existe)`);
    continue;
  }
  try {
    await client.query(
      `INSERT INTO public.exercicios
         (criado_por, nome, grupo_muscular, equipamento, dificuldade, descricao, instrucoes, seguranca, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [COACH, nome, grupo, equipamento, dificuldade, descricao, instrucoes, seguranca]
    );
    inseridos++;
    console.log(`  ok      ${nome}`);
  } catch (err) {
    erros++;
    console.error(`  ERRO    ${nome}: ${err.message}`);
  }
}

const [{ total }] = (await client.query(`SELECT count(*)::int AS total FROM public.exercicios`)).rows;
console.log(`\n===== RESUMO =====`);
console.log(`Inseridos: ${inseridos} | Pulados: ${pulados} | Erros: ${erros}`);
console.log(`Total na tabela exercicios: ${total}`);
await client.end();
process.exit(erros > 0 ? 1 : 0);
