// Seed v2 da biblioteca de exercícios — expansão curada e aprovada pelo coach
// Willian Sousa (CREF 2904-G/GO). Foco: variações com halteres/polia/peso
// corporal (academia de condomínio) + grupo novo "panturrilha".
// IDEMPOTENTE: verifica por nome e pula os que já existem. Não altera linhas existentes.
// Uso: node scripts/seed-exercicios-v2.mjs
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
  // ---------------------------- PANTURRILHA --------------------------------
  ["Elevação de panturrilha em pé com halteres", "panturrilha", "Halteres", "iniciante",
    "Elevação dos calcanhares em pé segurando halteres — o básico para força e volume de panturrilha.",
    "1. Em pé, halteres ao lado do corpo, pés na largura do quadril.\n2. Expire subindo nas pontas dos pés o mais alto que conseguir.\n3. Segure 1–2 segundos no topo contraindo a panturrilha.\n4. Inspire descendo os calcanhares com controle até o chão.",
    "Suba e desça sem quicar — o impulso rouba o estímulo. Se o equilíbrio atrapalhar, apoie uma mão na parede e segure halter só do outro lado."],
  ["Elevação de panturrilha unilateral no degrau", "panturrilha", "Degrau ou step", "intermediario",
    "Versão de uma perna no degrau, com amplitude completa e alongamento embaixo.",
    "1. Apoie a ponta de um pé na borda do degrau e cruze o outro pé atrás do tornozelo.\n2. Inspire descendo o calcanhar abaixo da linha do degrau até alongar a panturrilha.\n3. Expire subindo na ponta do pé o mais alto possível.\n4. Complete as repetições e troque de perna.",
    "Segure em um apoio para equilibrar — aqui o equilíbrio não é o objetivo. Desça devagar: a fase de alongamento é a mais importante e a mais fácil de estragar com pressa."],
  ["Panturrilha sentado com halter no joelho", "panturrilha", "Halter e banco", "iniciante",
    "Elevação de calcanhar sentado com o halter apoiado no joelho — enfatiza o sóleo, porção profunda da panturrilha.",
    "1. Sente no banco com as pontas dos pés em um degrau ou anilha e os calcanhares livres.\n2. Apoie um halter na vertical sobre cada joelho (use uma toalha para conforto).\n3. Expire subindo os calcanhares o máximo que conseguir.\n4. Inspire descendo devagar até alongar embaixo.",
    "Movimento curto por natureza — não compense com pressa. Segure os halteres firmes para não escorregarem do joelho."],
  ["Panturrilha no leg press", "panturrilha", "Leg press", "iniciante",
    "Elevação de calcanhares na plataforma do leg press, com carga estável e sem exigir equilíbrio.",
    "1. Sente no leg press e apoie só as pontas dos pés na parte baixa da plataforma, pernas estendidas.\n2. Expire empurrando a plataforma com as pontas dos pés até a extensão máxima do tornozelo.\n3. Inspire deixando a plataforma voltar devagar até alongar a panturrilha.",
    "Nunca destrave o carrinho com os pés na ponta — mantenha as travas de segurança da máquina. Joelhos estendidos mas não hiperestendidos."],
  // ------------------------------- PEITO -----------------------------------
  ["Supino reto com halteres", "peito", "Halteres e banco", "intermediario",
    "Versão com halteres do supino reto — amplitude maior que a barra e cada lado trabalha por igual.",
    "1. Deite no banco com um halter em cada mão na linha do peito, pés firmes no chão.\n2. Escápulas retraídas e punhos firmes.\n3. Expire empurrando os halteres para cima até quase se tocarem, sem travar os cotovelos.\n4. Inspire descendo com controle até a linha do peito.",
    "Para deitar com halteres pesados, apoie-os nas coxas e deite levando-os junto. Ao terminar, não os jogue para os lados — traga os joelhos e sente."],
  ["Crucifixo inclinado com halteres", "peito", "Halteres e banco inclinado", "intermediario",
    "Abertura no banco inclinado que alonga e isola a porção superior do peitoral.",
    "1. Ajuste o banco entre 30–45° e deite com os halteres acima do peito, cotovelos levemente flexionados.\n2. Inspire abrindo os braços em arco até sentir alongar o peitoral.\n3. Expire fechando o arco até os halteres quase se tocarem acima do peito.",
    "Não desça além do conforto do ombro nem estenda os cotovelos por completo. Carga menor que a do supino — aqui o alvo é o alongamento, não o peso."],
  ["Flexão declinada", "peito", "Peso corporal e banco", "intermediario",
    "Flexão com os pés elevados no banco, transferindo mais carga para a porção superior do peito e ombros.",
    "1. Apoie as pontas dos pés no banco e as mãos no chão na largura dos ombros.\n2. Corpo em linha reta, abdômen firme.\n3. Inspire descendo o peito em direção ao chão com os cotovelos a ~45°.\n4. Expire empurrando o chão até estender os braços.",
    "Mais difícil que a flexão comum — domine a versão no chão antes. Quadril não cai nem empina; se a lombar ceder, encerre a série."],
  // ------------------------------- COSTAS ----------------------------------
  ["Remada baixa na polia (triângulo)", "costas", "Polia baixa e triângulo", "iniciante",
    "Remada sentada na polia baixa com pegada neutra, construindo o meio das costas com apoio estável.",
    "1. Sente com os pés apoiados na plataforma e joelhos semiflexionados, segurando o triângulo.\n2. Tronco ereto e coluna neutra.\n3. Expire puxando o triângulo até o abdômen, cotovelos rentes ao corpo e escápulas apertadas.\n4. Inspire estendendo os braços com controle, sem deixar o peso arrastar o tronco à frente.",
    "O tronco balança no máximo alguns graus — remada é braço e costas, não lombar. Não arredonde a coluna na volta."],
  ["Remada curvada com halteres", "costas", "Halteres", "intermediario",
    "Remada com o tronco inclinado usando halteres — espessura de costas sem precisar de barra.",
    "1. Em pé, halteres nas mãos, incline o tronco a ~45° com a coluna neutra e joelhos semiflexionados.\n2. Braços estendidos com as palmas voltadas uma para a outra.\n3. Expire puxando os halteres até a linha do quadril, cotovelos junto ao corpo.\n4. Inspire descendo com controle até o alongamento completo.",
    "A coluna neutra é inegociável — se a lombar arredondar, reduza a carga. Não erga o tronco para ajudar a puxada."],
  ["Puxada supinada na polia", "costas", "Polia alta", "iniciante",
    "Puxada com as palmas voltadas para você — dorsal com forte participação do bíceps.",
    "1. Sente com as coxas travadas no apoio e segure a barra com pegada supinada na largura dos ombros.\n2. Expire puxando a barra até a parte alta do peito, cotovelos fechando junto ao corpo.\n3. Inspire subindo a barra com controle até estender os braços.",
    "Não se incline para trás para 'ganhar' a repetição — inclinação leve e fixa. Ombros longe das orelhas durante toda a puxada."],
  ["Face pull na polia", "costas", "Polia e corda", "intermediario",
    "Puxada da corda em direção ao rosto que fortalece a parte posterior dos ombros e a região entre as escápulas — ouro para a postura.",
    "1. Ajuste a polia na altura do rosto e segure as pontas da corda com as palmas para dentro.\n2. Dê um passo atrás e estenda os braços à frente.\n3. Expire puxando a corda em direção ao rosto, abrindo as pontas ao lado das orelhas e apertando as escápulas.\n4. Inspire voltando com controle.",
    "Carga leve e técnica limpa — este exercício não é de carga. Cotovelos altos, na linha dos ombros, e pescoço relaxado."],
  // ------------------------------- PERNAS ----------------------------------
  ["Agachamento goblet", "pernas", "Halter", "iniciante",
    "Agachamento segurando um halter junto ao peito — a melhor porta de entrada para agachar com carga e postura correta.",
    "1. Segure um halter na vertical junto ao peito, cotovelos apontando para baixo.\n2. Pés na largura dos ombros, pontas levemente para fora.\n3. Inspire descendo o quadril para trás e para baixo até pelo menos a coxa paralela, joelhos na direção dos pés.\n4. Expire subindo com força pelos calcanhares.",
    "O halter junto ao peito força o tronco ereto — se ele te puxar à frente, reduza a carga. Calcanhares no chão do início ao fim."],
  ["Agachamento sumô com halter", "pernas", "Halter", "iniciante",
    "Agachamento com base ampla e halter pendurado entre as pernas — mais ênfase em adutores e glúteos.",
    "1. Pés bem mais abertos que os ombros, pontas apontando para fora ~45°.\n2. Segure um halter na vertical com as duas mãos, braços estendidos entre as pernas.\n3. Inspire descendo o quadril entre os calcanhares, joelhos seguindo a direção dos pés.\n4. Expire subindo até a extensão completa, contraindo os glúteos no topo.",
    "Os joelhos não caem para dentro — eles seguem as pontas dos pés. Tronco o mais vertical possível."],
  ["Passada caminhando", "pernas", "Halteres ou peso corporal", "intermediario",
    "Sequência de afundos deslocando-se à frente — pernas, glúteos e muito equilíbrio.",
    "1. Em pé, halteres ao lado do corpo (ou mãos livres), dê um passo amplo à frente.\n2. Inspire descendo até os dois joelhos formarem ~90°, joelho de trás quase tocando o chão.\n3. Expire empurrando o chão e trazendo a perna de trás para o próximo passo à frente.\n4. Siga alternando as pernas pelo espaço disponível.",
    "Passos curtos jogam a pressão no joelho — dê passos amplos. Tronco ereto: se começar a cair à frente, reduza a carga."],
  ["Step-up no banco", "pernas", "Banco e halteres", "iniciante",
    "Subida no banco de uma perna por vez — força unilateral de quadríceps e glúteos com padrão do dia a dia.",
    "1. Em pé de frente para o banco, halteres ao lado do corpo (ou mãos livres).\n2. Apoie o pé inteiro de uma perna no banco.\n3. Expire subindo pela perna do banco até estender, sem impulsionar com a de baixo.\n4. Inspire descendo com controle e complete as repetições antes de trocar a perna.",
    "Quem trabalha é a perna de cima — a de baixo não empurra. Use uma altura em que o joelho não passe muito da linha do quadril."],
  ["Elevação pélvica unilateral", "pernas", "Peso corporal e banco", "intermediario",
    "Versão de uma perna da elevação pélvica — glúteo intenso sem precisar de carga.",
    "1. Apoie as escápulas no banco (ou deite no chão) com um pé firme no chão e a outra perna estendida ou com o joelho ao peito.\n2. Expire subindo o quadril pela perna de apoio até o tronco alinhar com a coxa, contraindo forte o glúteo.\n3. Inspire descendo com controle sem apoiar o quadril por completo.\n4. Complete as repetições e troque de perna.",
    "O quadril sobe reto, sem girar para o lado da perna livre. Costelas fechadas no topo — quem sobe é o quadril, não a lombar em arco."],
  ["Agachamento com salto", "pernas", "Peso corporal", "avancado",
    "Agachamento explosivo com salto — potência de pernas e condicionamento no mesmo movimento.",
    "1. Pés na largura dos ombros, desça em um agachamento até a coxa próxima da paralela.\n2. Expire explodindo para cima em um salto vertical, braços ajudando o impulso.\n3. Aterrisse macio, com joelhos flexionados e na direção dos pés.\n4. Emende a próxima descida com ritmo controlado.",
    "A aterrissagem manda: silenciosa e com joelhos alinhados. Dor no joelho ou aterrissagem dura = volte para o agachamento comum. Evite em piso escorregadio."],
  // --------------------------- POSTERIORES ---------------------------------
  ["Terra romeno unilateral", "posteriores de coxa", "Halter", "avancado",
    "Dobradiça de quadril em uma perna só — posteriores e glúteos com forte exigência de equilíbrio e controle.",
    "1. Em pé sobre uma perna, segure o halter na mão oposta à perna de apoio.\n2. Inspire inclinando o tronco à frente e empurrando o quadril para trás, a perna livre estendendo atrás como contrapeso.\n3. Desça até sentir alongar o posterior, coluna neutra e quadril nivelado.\n4. Expire subindo pelo quadril até a posição inicial.",
    "Domine primeiro sem carga, perto de um apoio. O quadril não abre para o lado — os dois lados do quadril apontam para o chão."],
  ["Good morning com halteres", "posteriores de coxa", "Halteres", "intermediario",
    "Dobradiça de quadril com os halteres apoiados nos ombros — posteriores, glúteos e lombar em cadeia.",
    "1. Em pé, apoie um halter em cada ombro, pés na largura do quadril e joelhos semiflexionados.\n2. Inspire empurrando o quadril para trás e inclinando o tronco à frente, coluna neutra.\n3. Desça até o tronco próximo da paralela ou o limite do alongamento do posterior.\n4. Expire subindo pelo quadril até a extensão completa.",
    "É uma inclinação de quadril, não de coluna — se as costas arredondarem, pare a descida ali. Comece leve: o braço de alavanca é longo e a carga parece maior do que é."],
  // ------------------------------- OMBROS ----------------------------------
  ["Desenvolvimento Arnold", "ombros", "Halteres", "intermediario",
    "Desenvolvimento com rotação dos punhos durante a subida, passando pelas três porções do deltoide.",
    "1. Sentado, halteres à frente dos ombros com as palmas voltadas para você.\n2. Expire empurrando os halteres para cima enquanto gira as palmas para frente.\n3. Termine com os braços estendidos acima da cabeça, sem travar os cotovelos.\n4. Inspire descendo e desfazendo o giro até a posição inicial.",
    "O giro é suave e acompanha a subida — não é um truque no final. Costelas fechadas e lombar longe de arquear."],
  ["Elevação lateral na polia", "ombros", "Polia baixa", "intermediario",
    "Elevação lateral com o cabo, mantendo tensão no deltoide do início ao fim do arco.",
    "1. De lado para a polia baixa, segure a manopla com a mão mais distante, braço cruzando à frente do corpo.\n2. Expire elevando o braço pelo lado até a altura do ombro, cotovelo levemente flexionado.\n3. Inspire descendo devagar, resistindo à volta do cabo.\n4. Complete as repetições e troque de lado.",
    "Carga leve: se o tronco inclinar para ajudar, está pesado demais. O punho não passa da linha do cotovelo no topo."],
  ["Desenvolvimento militar com barra", "ombros", "Barra", "avancado",
    "Empurrada da barra acima da cabeça em pé — força de ombros com o corpo inteiro estabilizando.",
    "1. Em pé, barra apoiada na parte da frente dos ombros, pegada pouco mais aberta que eles.\n2. Abdômen e glúteos firmes.\n3. Expire empurrando a barra para cima em linha reta, tirando a cabeça levemente do caminho.\n4. Termine com a barra sobre o meio do pé e inspire descendo com controle até os ombros.",
    "Sem impulso de pernas e sem arquear a lombar — se precisar de um dos dois, reduza a carga. Trave o abdômen como numa prancha."],
  ["Encolhimento com halteres", "ombros", "Halteres", "iniciante",
    "Elevação dos ombros em direção às orelhas com halteres — construção direta do trapézio.",
    "1. Em pé, halteres ao lado do corpo, braços estendidos e relaxados.\n2. Expire encolhendo os ombros verticalmente em direção às orelhas.\n3. Segure 1 segundo no topo.\n4. Inspire descendo devagar até o alongamento completo.",
    "O movimento é só para cima e para baixo — não gire os ombros. Pescoço neutro, sem projetar o queixo à frente."],
  // ------------------------------- BÍCEPS ----------------------------------
  ["Rosca concentrada", "biceps", "Halter e banco", "iniciante",
    "Rosca sentado com o cotovelo travado na coxa — isolamento máximo do bíceps, sem espaço para roubo.",
    "1. Sentado no banco, apoie a parte de trás do braço na parte interna da coxa, halter pendurado.\n2. Expire flexionando o cotovelo até o halter chegar perto do ombro.\n3. Inspire descendo devagar até estender o braço por completo.\n4. Complete as repetições e troque de braço.",
    "O braço não sai da coxa em nenhum momento. Desça até a extensão completa — meia repetição aqui não vale."],
  ["Rosca inclinada com halteres", "biceps", "Halteres e banco inclinado", "intermediario",
    "Rosca deitado no banco inclinado, com os braços atrás da linha do tronco — alonga a cabeça longa do bíceps.",
    "1. Ajuste o banco a ~45–60° e deite com os halteres pendurados, palmas para frente.\n2. Ombros apoiados no encosto durante toda a série.\n3. Expire flexionando os cotovelos sem deixá-los avançar à frente.\n4. Inspire descendo devagar até o alongamento completo.",
    "A posição alongada é intensa — use menos carga que na rosca em pé. Se o ombro descolar do banco para ajudar, está pesado."],
  ["Rosca 21", "biceps", "Barra ou halteres", "intermediario",
    "Três séries de 7 repetições parciais emendadas — metade de baixo, metade de cima e amplitude completa — para um estímulo intenso de bíceps.",
    "1. Segure a barra com pegada supinada, cotovelos junto ao tronco.\n2. Expire em cada subida: 7 repetições da extensão até a metade do arco.\n3. Sem descanso, 7 repetições da metade do arco até o topo.\n4. Finalize com 7 repetições completas, inspirando em cada descida.",
    "São 21 repetições sem pausa — escolha uma carga bem menor que a da rosca direta. Cotovelos fixos: quando o ombro entra no movimento, a série acabou."],
  // ------------------------------- TRÍCEPS ---------------------------------
  ["Tríceps testa com halteres", "triceps", "Halteres e banco", "intermediario",
    "Extensão de cotovelos deitado, descendo os halteres em direção à testa — trabalho direto das três cabeças do tríceps.",
    "1. Deite no banco com os halteres acima do peito, palmas voltadas uma para a outra.\n2. Inspire flexionando só os cotovelos, descendo os halteres ao lado da cabeça.\n3. Expire estendendo os braços de volta ao alto, sem mexer os ombros.",
    "Os cotovelos apontam para o teto o tempo todo — se abrirem, reduza a carga. Halteres passam ao lado da cabeça, nunca sobre o rosto."],
  ["Tríceps coice (kickback)", "triceps", "Halter", "iniciante",
    "Extensão do cotovelo com o tronco inclinado — contração forte do tríceps no final do movimento.",
    "1. Incline o tronco à frente com a coluna neutra, apoiando mão e joelho no banco se preferir.\n2. Cotovelo colado ao tronco, braço paralelo ao chão e antebraço pendurado.\n3. Expire estendendo o cotovelo até o braço ficar reto atrás do corpo.\n4. Segure 1 segundo e inspire voltando com controle.",
    "O cotovelo não desce nem abre — só o antebraço se move. Carga leve: balanço do halter significa impulso, não trabalho."],
  ["Flexão diamante", "triceps", "Peso corporal", "avancado",
    "Flexão com as mãos juntas formando um diamante — a versão de flexão que mais exige do tríceps.",
    "1. Apoie as mãos no chão sob o peito, com indicadores e polegares se tocando em formato de diamante.\n2. Corpo em linha reta, abdômen firme.\n3. Inspire descendo o peito em direção às mãos, cotovelos fechando junto ao corpo.\n4. Expire empurrando o chão até estender os braços.",
    "Exige punhos e ombros preparados — se incomodar, afaste um pouco as mãos ou apoie os joelhos. Quadril alinhado do início ao fim."],
  // -------------------------------- CORE -----------------------------------
  ["Abdominal bicicleta", "core", "Peso corporal", "iniciante",
    "Pedalada deitado alternando cotovelo e joelho opostos — reto do abdômen e oblíquos no mesmo exercício.",
    "1. Deite de costas com as mãos atrás da cabeça e as pernas elevadas, joelhos a 90°.\n2. Expire girando o tronco e levando o cotovelo em direção ao joelho oposto, enquanto estende a outra perna.\n3. Inspire voltando ao centro e repita para o outro lado em ritmo de pedalada.",
    "As mãos não puxam o pescoço — os cotovelos ficam abertos. Quanto mais baixa a perna estendida, mais difícil: suba-a se a lombar descolar do chão."],
  ["Russian twist", "core", "Peso corporal ou halter", "intermediario",
    "Rotação do tronco sentado com os pés fora do chão — força de oblíquos com ou sem carga.",
    "1. Sente no chão, incline o tronco levemente para trás e eleve os pés (ou mantenha os calcanhares apoiados para facilitar).\n2. Segure as mãos juntas ou um halter à frente do peito.\n3. Expire girando o tronco para um lado, levando as mãos em direção ao chão.\n4. Inspire passando pelo centro e expire girando para o outro lado.",
    "Quem gira é o tronco, não só os braços. Coluna longe de arredondar — se a lombar reclamar, apoie os calcanhares e diminua o giro."],
  ["Elevação de pernas no solo", "core", "Peso corporal", "iniciante",
    "Subida e descida das pernas estendidas deitado — ênfase na porção inferior do abdômen.",
    "1. Deite de costas com as pernas estendidas e as mãos ao lado do corpo ou sob o quadril.\n2. Expire elevando as pernas até ~90° com o tronco.\n3. Inspire descendo devagar até quase tocar o chão, sem apoiar os pés.",
    "A lombar fica pressionada contra o chão o tempo todo — se descolar na descida, desça menos ou flexione os joelhos. Sem balanço para subir."],
  ["Mountain climber", "core", "Peso corporal", "iniciante",
    "Corrida no lugar em posição de prancha — core, ombros e condicionamento ao mesmo tempo.",
    "1. Em posição de prancha alta, mãos sob os ombros e corpo em linha reta.\n2. Traga um joelho em direção ao peito e volte.\n3. Alterne as pernas em ritmo constante, como uma corrida.\n4. Respire de forma ritmada, sem prender o ar.",
    "O quadril fica baixo e estável — se começar a subir ou rebolar, desacelere. Ombros sempre sobre as mãos."],
  ["Prancha com toque no ombro", "core", "Peso corporal", "intermediario",
    "Prancha alta tocando o ombro oposto com a mão — anti-rotação que desafia a estabilidade do tronco.",
    "1. Em prancha alta, mãos sob os ombros e pés um pouco mais afastados que o quadril.\n2. Expire tirando uma mão do chão e tocando o ombro oposto.\n3. Inspire devolvendo a mão ao chão e repita com o outro lado.\n4. Mantenha o quadril paralelo ao chão o tempo todo.",
    "O objetivo é o quadril NÃO girar — vale mais devagar e estável que rápido e rebolando. Pés mais abertos facilitam; mais juntos dificultam."],
  // ------------------------------- CARDIO ----------------------------------
  ["Burpee", "cardio", "Peso corporal", "intermediario",
    "Sequência de agachar, prancha, flexão e salto — condicionamento de corpo inteiro em um só movimento.",
    "1. Agache e apoie as mãos no chão à frente dos pés.\n2. Salte os pés para trás caindo em prancha e faça uma flexão (opcional).\n3. Salte os pés de volta para perto das mãos.\n4. Expire explodindo em um salto vertical com braços acima da cabeça e emende a próxima repetição.",
    "Qualidade primeiro: prancha firme e aterrissagem macia mesmo cansado. Versão mais leve: sem flexão e sem salto, só subindo em pé."],
  ["Pular corda", "cardio", "Corda", "iniciante",
    "Saltos contínuos na corda — condicionamento, coordenação e panturrilhas de bônus.",
    "1. Segure a corda com os cotovelos próximos ao corpo e gire pelos punhos, não pelos braços.\n2. Salte baixo (2–4 cm do chão), aterrissando na ponta dos pés com os joelhos levemente flexionados.\n3. Mantenha ritmo constante e respire de forma ritmada.\n4. Comece com séries curtas e aumente o tempo aos poucos.",
    "Salto baixo e macio — saltos altos cansam à toa e castigam o joelho. Piso muito duro ou muito macio atrapalha: prefira quadra, borracha ou madeira."],
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
