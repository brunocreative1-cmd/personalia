-- ============================================================================
-- seed_orientacoes.sql — orientacoes_base + erro_comum (72 exercicios) + inativacao
-- Fonte: orientacoes_APROVADAS.csv · aprovado pelo coach (CREF 2904-G/GO) em 18/07/2026
-- Constantes: 72 orientados · 1 inativado (Elevacao de pernas no solo) · 73->72 ativos
-- Hash canonico do conteudo: c77df6c88a56e26c4eb0b640adac072a02e96edbf26af6477bd58ea31f52cd8e
-- APLICACAO: termina em COMMIT.
-- ============================================================================
begin;

do $$
declare c int;
begin
  select count(*) into c from public.exercicios where ativo;
  if c <> 73 then raise exception 'seed ABORTADO: % ativos (esperado 73)', c; end if;
  select count(*) into c from public.exercicios where orientacoes_base is not null or erro_comum is not null;
  if c <> 0 then raise exception 'seed ABORTADO: % exercicios ja tem conteudo (esperado 0)', c; end if;
  select count(*) into c from public.exercicios where id='e921121b-f6e2-46d0-a082-cceb3245afb9' and ativo;
  if c <> 1 then raise exception 'seed ABORTADO: exercicio a inativar nao encontrado ativo'; end if;
end $$;

update public.exercicios e
set orientacoes_base = array[v.o1, v.o2, v.o3], erro_comum = v.er
from (values
  ('661386f5-0e86-4eb3-a452-ee215e4f4fb2'::uuid, 'Deite de costas com as mãos atrás da cabeça e os joelhos dobrados.', 'Leve o cotovelo em direção ao joelho oposto, alternando os lados.', 'Gire o tronco devagar, sem pressa.', 'Evite puxar o pescoço com as mãos durante o giro.'),
  ('046e185d-3fa6-43db-84e0-6b56f5eec2f9'::uuid, 'Deite de costas com os joelhos levemente dobrados.', 'Suba as pernas e tire levemente o quadril do chão no final.', 'Desça só até onde consegue manter a lombar apoiada.', 'Evite deixar a lombar arquear quando as pernas descem.'),
  ('b3d63901-7ce2-455c-b966-391deb018272'::uuid, 'Dê um passo à frente com o tronco reto.', 'Desça com controle até o joelho de trás se aproximar do chão.', 'Suba mantendo o pé da frente inteiro apoiado.', 'Evite inclinar o tronco para a frente na descida.'),
  ('e5c255a0-8e38-4d53-aef5-8cec39dfe82d'::uuid, 'Apoie o peito do pé de trás no banco e afaste o pé da frente.', 'Desça o joelho de trás em direção ao chão.', 'Suba mantendo o pé da frente inteiro apoiado.', 'Evite apoiar todo o peso na perna de trás.'),
  ('bdb1c3ac-153f-4433-893c-028be2a3adc3'::uuid, 'Fique em pé com os pés na largura dos ombros.', 'Agache e salte para cima com força.', 'Aterrisse de leve, com os joelhos dobrados.', 'Evite aterrissar com as pernas esticadas.'),
  ('f8b88f93-c706-4595-9457-3f8127e0ea2a'::uuid, 'Segure o halter na vertical junto ao peito.', 'Desça até onde mantém os pés firmes e as costas bem posicionadas.', 'Suba mantendo os pés inteiros apoiados no chão.', 'Evite deixar os joelhos caírem para dentro na subida.'),
  ('2d3db2f0-b41a-4b24-b471-0d5017311d7c'::uuid, 'Apoie a barra na parte alta das costas e firme os pés no chão.', 'Desça até onde mantém os pés firmes e as costas bem posicionadas.', 'Suba com força mantendo os joelhos na direção dos pés.', 'Evite curvar as costas embaixo da barra.'),
  ('23e570d1-d117-48e4-a60d-79e69395434a'::uuid, 'Afaste bem os pés, com as pontas viradas para fora.', 'Desça o quadril entre os calcanhares segurando o halter.', 'Suba até ficar reto, apertando o bumbum no final.', 'Evite inclinar o tronco para a frente na descida.'),
  ('5ed048fc-fdfd-42a4-a999-7e6cf0063b5b'::uuid, 'Segure a barra com as mãos um pouco mais abertas que os ombros.', 'Puxe o corpo levando o peito em direção à barra.', 'Desça devagar sem projetar o queixo para a frente.', 'Evite balançar o corpo para ganhar impulso.'),
  ('d61f78f2-f621-46fc-a6bb-62f4e8960eb8'::uuid, 'Ajuste o banco para manter leve dobra no joelho com o pedal embaixo.', 'Pedale em ritmo constante na resistência combinada.', 'Respire de forma ritmada o tempo todo.', 'Evite pedalar com o joelho muito dobrado no ponto mais baixo.'),
  ('776d8fa5-03da-4e23-8921-da0f6d48c0a6'::uuid, 'Agache e apoie as mãos no chão.', 'Leve os pés para trás, faça a flexão, volte e salte.', 'Aterrisse de leve e siga no seu ritmo.', 'Evite deixar o quadril cair quando os pés vão para trás.'),
  ('d77dae16-718a-4ed8-8b15-1f689d51c70d'::uuid, 'Ajuste o encosto e encaixe o rolo na frente dos tornozelos.', 'Estique as pernas até quase retas.', 'Desça devagar, sem deixar o peso bater.', 'Evite soltar o peso de uma vez na descida.'),
  ('51667ed6-1bc9-4801-9c07-bf2f48626066'::uuid, 'Segure as manoplas com as polias acima dos ombros.', 'Traga as mãos em arco até se aproximarem à frente do peito.', 'Volte devagar até sentir alongar o peito.', 'Evite dobrar demais os cotovelos durante o arco.'),
  ('ee28820b-246c-4ca8-9fa8-949166967158'::uuid, 'Deite no banco com os halteres acima do peito.', 'Abra os braços em arco até sentir alongar o peito.', 'Feche o arco devagar, cotovelos levemente dobrados.', 'Evite descer os halteres além do confortável.'),
  ('1374b932-aada-485c-8034-154eb77389bc'::uuid, 'Incline o banco e deite com os halteres acima do peito.', 'Abra os braços em arco até sentir alongar o peito.', 'Feche devagar, cotovelos levemente dobrados.', 'Evite bater os halteres com força no topo.'),
  ('6404cc48-5bd1-4af1-90b6-40dd7c8cba09'::uuid, 'Incline o tronco à frente com os halteres pendurados.', 'Abra os braços para os lados até a linha dos ombros.', 'Feche devagar, sem balançar o tronco.', 'Evite levantar o tronco durante a abertura.'),
  ('2f824623-df47-4957-ae4d-46582b78dd64'::uuid, 'Deite de costas com os braços para o teto e joelhos dobrados.', 'Estique uma perna e o braço oposto sem tocar o chão.', 'Mantenha a lombar colada no chão o tempo todo.', 'Evite deixar a lombar descolar do chão.'),
  ('defc3174-26c9-4e59-88dd-b0f768e3f00e'::uuid, 'Sente com os halteres à frente dos ombros, palmas para você.', 'Empurre para cima girando as palmas para a frente.', 'Desça devagar desfazendo o giro.', 'Evite arquear as costas para empurrar.'),
  ('f0d4e098-e398-4a46-8363-6077480d3d2a'::uuid, 'Segure os halteres na altura das orelhas, palmas para a frente.', 'Empurre para cima até quase se tocarem.', 'Desça com controle até a altura das orelhas.', 'Evite travar os cotovelos no topo.'),
  ('6a752028-4154-4b4c-be7b-8480dac0cccf'::uuid, 'Apoie a barra na frente dos ombros, abdômen firme.', 'Empurre a barra para cima em linha reta.', 'Desça com controle até os ombros.', 'Evite arquear a lombar quando a barra sobe.'),
  ('f2f38ee2-6dda-4e27-bda1-fd3a6e938383'::uuid, 'Fique em pé com os halteres ao lado do corpo.', 'Suba na ponta dos pés o mais alto que conseguir.', 'Segure no alto e desça devagar.', 'Evite descer o calcanhar de uma vez.'),
  ('7140c9fd-742b-4f05-985f-ba54d8ef33d1'::uuid, 'Apoie a ponta de um pé na borda do degrau.', 'Desça o calcanhar até alongar e suba na ponta do pé.', 'Segure em algo para equilibrar e vá devagar.', 'Evite repetições curtas, sem descer o calcanhar.'),
  ('a2f8438a-ffdc-45da-bfb8-a191fb2b1a24'::uuid, 'Fique em pé com os halteres à frente das coxas.', 'Suba os braços à frente até a altura dos ombros.', 'Desça com controle, sem balançar o corpo.', 'Evite jogar o tronco para trás para subir o peso.'),
  ('a950d07d-662f-4e0d-92fa-6096aed23252'::uuid, 'Fique em pé com os halteres ao lado do corpo.', 'Suba os braços pelos lados até a altura dos ombros.', 'Desça devagar, resistindo à volta.', 'Evite subir os ombros junto com os braços.'),
  ('9edd980e-aab9-4491-b6bf-d5714cd1a3fa'::uuid, 'Fique de lado para a polia e segure a manopla.', 'Suba o braço pelo lado até a altura do ombro.', 'Desça devagar, segurando a volta do cabo.', 'Evite girar o tronco para ajudar o movimento.'),
  ('82787741-6508-4375-a4ae-9cc23b515ae0'::uuid, 'Apoie as costas no banco com a barra sobre o quadril.', 'Suba o quadril até o tronco ficar reto, apertando o bumbum.', 'Desça com controle, sem relaxar no chão.', 'Evite arquear a lombar no topo do movimento.'),
  ('7f5ee3f1-c8d3-48e8-833c-b7368f5214ae'::uuid, 'Apoie as costas no banco com um pé firme no chão.', 'Suba o quadril pela perna de apoio, apertando o bumbum.', 'Mantenha o quadril nivelado o tempo todo.', 'Evite deixar o quadril cair para o lado da perna livre.'),
  ('97cca114-c752-44e2-a21a-8ed1c2fc5477'::uuid, 'Fique em pé com os halteres ao lado do corpo.', 'Suba os ombros em direção às orelhas.', 'Segure 1 segundo e desça devagar.', 'Evite girar os ombros em círculo.'),
  ('b876ad86-6dc5-41b1-86e8-816d3717b5d8'::uuid, 'Ajuste a inclinação e uma velocidade que desafie sem correr.', 'Caminhe com o tronco alto e passos naturais, sem se pendurar.', 'Respire de forma ritmada durante todo o tempo.', 'Evite se pendurar no apoio da esteira.'),
  ('68c43d1b-18f4-4c2f-b4dd-0b4d96402985'::uuid, 'Ajuste a polia na altura do rosto e segure a corda.', 'Puxe a corda em direção ao rosto, abrindo as pontas.', 'Volte devagar, com o tronco parado.', 'Evite inclinar o tronco para trás para puxar.'),
  ('cde2e28f-75bb-45ad-9e77-18309a6358ee'::uuid, 'Apoie as mãos no chão na largura dos ombros, corpo reto.', 'Desça o peito em direção ao chão.', 'Suba até esticar os braços, abdômen firme.', 'Evite deixar o quadril cair no meio do movimento.'),
  ('8517085a-0f48-4c8b-9cca-f620624c6a80'::uuid, 'Apoie os pés no banco e as mãos no chão.', 'Desça o peito em direção ao chão.', 'Suba mantendo o corpo em linha reta.', 'Evite abrir demais os cotovelos na descida.'),
  ('2915646b-bf96-4c5b-996f-9eafda5f9c9e'::uuid, 'Junte as mãos sob o peito formando um diamante.', 'Desça o peito em direção às mãos, cotovelos junto ao corpo.', 'Suba até esticar os braços, corpo em linha reta.', 'Evite abrir os cotovelos para os lados.'),
  ('2457dc0e-d411-466a-abd9-74ff1f5cfde9'::uuid, 'Apoie um halter em cada ombro, joelhos levemente dobrados.', 'Incline o tronco à frente empurrando o quadril para trás.', 'Suba pelo quadril mantendo as costas retas.', 'Evite arredondar as costas na descida.'),
  ('3e8e117e-310d-4748-95f6-118111b3ea96'::uuid, 'Sente com a lombar apoiada e os pés na plataforma.', 'Desça só até onde consegue manter a lombar apoiada.', 'Empurre de volta sem travar os joelhos.', 'Evite tirar a lombar do encosto na descida.'),
  ('19a37697-0146-4764-ab7e-6b0ae3875152'::uuid, 'Segure a barra à frente das coxas, joelhos levemente dobrados.', 'Empurre o quadril para trás descendo a barra rente às pernas.', 'Suba pelo quadril sem arredondar as costas.', 'Evite afastar a barra do corpo na descida.'),
  ('170ff467-f27d-4bc2-b2f7-5868935fe50c'::uuid, 'Apoie as mãos na borda do banco atrás de você.', 'Desça apenas até onde os ombros ficam confortáveis.', 'Suba mantendo o quadril próximo ao banco.', 'Evite afastar o quadril do banco na descida.'),
  ('6bfa4094-11e3-43a8-864e-924117ec69f6'::uuid, 'Deite de bruços com o rolo atrás dos tornozelos.', 'Dobre os joelhos trazendo o rolo em direção ao bumbum.', 'Volte devagar, sem deixar o peso bater.', 'Evite levantar o quadril do banco durante a puxada.'),
  ('92d6a4cc-77c1-441f-8502-bc497047ba05'::uuid, 'Fique em prancha com as mãos sob os ombros.', 'Traga um joelho ao peito e alterne as pernas em ritmo.', 'Mantenha o quadril alinhado ao tronco durante as trocas.', 'Evite deixar a lombar afundar quando acelera as pernas.'),
  ('c7632f0b-04c2-44d8-93d4-5248b2497935'::uuid, 'Fique de lado para a polia com a manopla junto ao peito.', 'Estique os braços à frente sem deixar o tronco girar.', 'Traga as mãos de volta devagar.', 'Evite girar o tronco quando os braços esticam.'),
  ('8e13f085-21ad-47d2-ba69-28fcc0257fba'::uuid, 'Apoie só as pontas dos pés na parte de baixo da plataforma.', 'Empurre com as pontas dos pés até esticar o tornozelo.', 'Volte devagar até sentir alongar.', 'Evite dobrar os joelhos para ajudar o movimento.'),
  ('8f441a96-d6cd-484d-9fd0-9cb2eb56718c'::uuid, 'Sente com as pontas dos pés no degrau e a carga apoiada nos joelhos.', 'Suba os calcanhares o máximo que conseguir.', 'Desça devagar até alongar embaixo.', 'Evite amplitude curta, sem descer os calcanhares.'),
  ('513f3b2e-3d6d-4c65-afd0-99a03b1d1175'::uuid, 'Dê um passo amplo à frente com o tronco reto.', 'Desça com controle até o joelho de trás se aproximar do chão.', 'Empurre o chão e traga a perna de trás para o próximo passo.', 'Evite bater o joelho de trás no chão durante a passada.'),
  ('68934767-5f07-4b74-a754-0aeb3d0f8c7b'::uuid, 'Apoie antebraços e pontas dos pés, cotovelos sob os ombros.', 'Alinhe cabeça, tronco e quadril em linha reta.', 'Respire normalmente e segure o tempo combinado.', 'Evite deixar o quadril cair ou subir demais.'),
  ('9cee3fd3-2583-484b-8114-1c8e2ad831a4'::uuid, 'Fique em prancha alta com os pés um pouco afastados.', 'Toque o ombro oposto com uma mão e alterne.', 'Mantenha o quadril parado, sem balançar.', 'Evite balançar o quadril de um lado para o outro.'),
  ('14c3ec91-3023-40ab-9fad-3127bfdc3287'::uuid, 'Deite de lado com o cotovelo sob o ombro.', 'Suba o quadril até o corpo formar uma linha reta.', 'Segure firme e respire normalmente.', 'Evite deixar o quadril cair durante o tempo.'),
  ('cb1092e4-2699-445e-9399-2c6863f113cc'::uuid, 'Segure a corda com os cotovelos perto do corpo.', 'Gire pelos punhos e salte baixo, na ponta dos pés.', 'Aterrisse de leve, joelhos levemente dobrados.', 'Evite saltar alto demais: o pulo é curto e rápido.'),
  ('b9ef7fc4-72bc-4a30-947f-da31a274d3a7'::uuid, 'Segure a barra com os cotovelos levemente dobrados.', 'Leve a barra em arco até encostar na coxa.', 'Suba devagar até a altura inicial.', 'Evite transformar o movimento em uma puxada com os cotovelos.'),
  ('9a336e4d-d783-4e07-bd1e-efbc12262300'::uuid, 'Sente com as coxas presas sob o apoio e segure a barra aberta.', 'Puxe a barra até a parte de cima do peito.', 'Suba a barra devagar até quase estender os braços.', 'Evite inclinar o tronco para trás para puxar.'),
  ('33178ec7-df49-48de-88bf-87c2154b6ee9'::uuid, 'Segure a barra com as palmas viradas para você.', 'Puxe até a parte de cima do peito, cotovelos junto ao corpo.', 'Suba devagar até esticar os braços.', 'Evite balançar o tronco para ajudar a puxada.'),
  ('2b072074-794a-4b69-9b8e-eb1dc2dad245'::uuid, 'Sente com os pés na plataforma e segure o triângulo.', 'Puxe até o abdômen com o tronco reto.', 'Estique os braços devagar, sem inclinar à frente.', 'Evite balançar o tronco para frente e para trás.'),
  ('20adbfa8-2871-4185-b7a3-46a92c684608'::uuid, 'Fique sobre a barra com o tronco inclinado e costas retas.', 'Puxe a barra em direção ao abdômen.', 'Desça com controle até esticar os braços.', 'Evite levantar o tronco durante a puxada.'),
  ('6ca17cc5-5b78-43b9-85be-efebf3a86fc6'::uuid, 'Incline o tronco com as costas retas e joelhos dobrados.', 'Puxe a barra em direção ao abdômen.', 'Desça com controle mantendo o tronco parado.', 'Evite arredondar as costas com o peso.'),
  ('45a72af4-8929-45a2-9bd8-f6c4e17ef2e0'::uuid, 'Incline o tronco com as costas retas e um halter em cada mão.', 'Puxe os halteres até a linha do quadril.', 'Desça devagar até alongar.', 'Evite levantar o tronco a cada repetição.'),
  ('3468eea5-c0db-497c-a359-a5f380614adf'::uuid, 'Apoie joelho e mão no banco, costas retas.', 'Puxe o halter até a linha do quadril, cotovelo rente ao corpo.', 'Desça devagar até alongar.', 'Evite girar o tronco para levantar o peso.'),
  ('ae4f075f-1e0c-4685-849d-69a19b0e0c9a'::uuid, 'Segure a barra com os cotovelos junto ao tronco.', 'Faça 7 na metade de baixo, 7 na metade de cima e 7 completas.', 'Desça sempre com controle, sem balançar.', 'Evite balançar o corpo nas últimas repetições.'),
  ('241b31f1-dfbf-4d66-9cf2-bc7106bb9938'::uuid, 'Fique em pé com os halteres ao lado do corpo.', 'Suba um halter girando a palma para cima.', 'Desça com controle e alterne o braço.', 'Evite balançar o cotovelo para a frente na subida.'),
  ('509e9457-e44f-4f6c-b059-fcbf38e56878'::uuid, 'Sente e apoie o braço na parte interna da coxa.', 'Suba o halter em direção ao ombro.', 'Desça devagar até quase estender o braço.', 'Evite parar a descida antes de completar o movimento.'),
  ('4cfc8e09-cbaa-48ab-aa99-a95b76f33dac'::uuid, 'Segure a barra com as palmas para cima, cotovelos no tronco.', 'Suba a barra até perto do peito.', 'Desça com controle até esticar os braços.', 'Evite jogar o quadril à frente para subir a barra.'),
  ('91b11f6e-93a4-4707-9b48-d30724aa1bab'::uuid, 'Deite no banco inclinado com os halteres pendurados.', 'Suba os halteres sem deixar os cotovelos irem à frente.', 'Desça devagar até alongar por completo.', 'Evite tirar os ombros do encosto.'),
  ('8ae781c1-022b-4f71-8a52-e671402e1788'::uuid, 'Segure os halteres com as palmas viradas uma para a outra.', 'Suba dobrando os cotovelos, sem girar as palmas.', 'Desça devagar até esticar.', 'Evite balançar o tronco para ajudar.'),
  ('94459e12-d325-463b-8285-f8fd116f5264'::uuid, 'Sente com os pés apoiados e incline levemente o tronco.', 'Gire o tronco levando as mãos de um lado ao outro.', 'Gire o tronco em uma amplitude curta e controlada.', 'Evite usar impulso para levar as mãos de um lado ao outro.'),
  ('bd90ddf0-1be1-4295-a1b1-4c1bfa1822c8'::uuid, 'Fique de frente para o banco e apoie o pé inteiro nele.', 'Suba pela perna do banco até esticar.', 'Desça com controle, sem pular.', 'Evite impulsionar com a perna que está no chão.'),
  ('3afaf3d9-705e-41ec-b977-4b586a19d746'::uuid, 'Fique em pé com os halteres à frente das coxas.', 'Empurre o quadril para trás descendo rente às pernas.', 'Suba apertando o bumbum, sem arredondar as costas.', 'Evite dobrar demais os joelhos e virar agachamento.'),
  ('378000ce-38b2-4eab-a849-fe64031fc293'::uuid, 'Deite com os pés firmes e os ombros apoiados no banco inclinado.', 'Empurre para cima até quase se tocarem.', 'Desça com controle até a linha do peito.', 'Evite bater os halteres no topo.'),
  ('92a20ed6-c394-42a9-bbfb-4eae4bcbbe02'::uuid, 'Deite com os pés firmes e puxe os ombros para trás no banco.', 'Desça a barra até a linha do peito.', 'Empurre mantendo os ombros e o quadril apoiados.', 'Evite quicar a barra no peito.'),
  ('bd53615a-bcd0-43b0-b9e6-2a3e806b2d14'::uuid, 'Deite com os pés firmes e os ombros apoiados no banco.', 'Empurre para cima até quase se tocarem.', 'Desça com controle até a linha do peito.', 'Evite deixar os halteres caírem para os lados.'),
  ('aa34563c-7626-4df4-a2b0-7821d6259e24'::uuid, 'Fique sobre uma perna com o halter na mão oposta.', 'Incline o tronco à frente empurrando o quadril para trás.', 'Suba mantendo o quadril nivelado.', 'Evite girar o quadril para o lado na descida.'),
  ('a5349cd0-4af5-479e-87ac-9887b6b1b80a'::uuid, 'Incline o tronco com o cotovelo colado ao corpo.', 'Estique o braço para trás até ficar reto.', 'Segure 1 segundo e volte devagar.', 'Evite soltar o cotovelo do lado do corpo.'),
  ('6d3248d9-6d36-4038-b8fe-90f3db821f5c'::uuid, 'Segure um halter com as duas mãos acima da cabeça.', 'Desça o halter atrás da cabeça dobrando os cotovelos.', 'Estique os braços de volta ao alto.', 'Evite abrir os cotovelos para os lados.'),
  ('b4eedf12-cb7c-461f-8ea1-1de7d108a543'::uuid, 'Segure a corda na polia alta, cotovelos colados no tronco.', 'Estique os braços para baixo abrindo as pontas no final.', 'Suba devagar sem deixar os cotovelos saírem do lugar.', 'Evite inclinar o tronco para empurrar a corda.'),
  ('cdc004bf-8510-4972-b7d4-0a329fadee26'::uuid, 'Deite com os halteres acima do peito, palmas uma para a outra.', 'Dobre só os cotovelos descendo ao lado da cabeça.', 'Estique de volta sem mexer os ombros.', 'Evite mexer os ombros junto com os cotovelos.')
) as v(id, o1, o2, o3, er)
where e.id = v.id;

update public.exercicios set ativo = false where id = 'e921121b-f6e2-46d0-a082-cceb3245afb9' and ativo;

do $$
declare c int; h text;
begin
  select count(*) into c from public.exercicios where orientacoes_base is not null and erro_comum is not null;
  if c <> 72 then raise exception 'seed ABORTADO pos-update: % preenchidos (esperado 72)', c; end if;
  select count(*) into c from public.exercicios where ativo;
  if c <> 72 then raise exception 'seed ABORTADO pos-update: % ativos (esperado 72)', c; end if;
  select encode(extensions.digest(
    string_agg(e.id::text || '|' || array_to_string(e.orientacoes_base,'|') || '|' || e.erro_comum,
               E'\n' order by e.id::text), 'sha256'), 'hex') into h
  from public.exercicios e where e.orientacoes_base is not null;
  if h is distinct from 'c77df6c88a56e26c4eb0b640adac072a02e96edbf26af6477bd58ea31f52cd8e' then
    raise exception 'seed ABORTADO: hash % difere do canonico aprovado c77df6c88a56e26c…', coalesce(left(h,16),'NULL');
  end if;
  raise notice 'seed OK: 72 orientados, 1 inativado, hash confere: c77df6c88a56e26c…';
end $$;

commit;
