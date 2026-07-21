-- ============================================================================
-- seed_exercicio_musculos.sql — mapa muscular dos 73 exercicios ativos
-- Fonte: mapa_muscular_FINAL.csv aprovado pelo coach (CREF 2904-G/GO) em 17/07/2026
-- Constantes congeladas: 73 exercicios · 16 musculos · 200 vinculos (89 prim + 111 sec)
-- Hash canonico do conteudo: 3bbcde46a70016a255c1a3b4daa0a2f23791942b788f53226ae01d6958d116d4
-- ENSAIO: termina em ROLLBACK. O arquivo APPLY difere apenas na ultima instrucao.
-- ============================================================================
begin;

do $$
declare c int;
begin
  select count(*) into c from public.exercicio_musculos;
  if c <> 0 then raise exception 'seed ABORTADO: exercicio_musculos ja tem % linhas (esperado 0)', c; end if;
  select count(*) into c from public.musculos;
  if c <> 16 then raise exception 'seed ABORTADO: musculos tem % linhas (esperado 16)', c; end if;
  select count(*) into c from public.exercicios where ativo;
  if c <> 73 then raise exception 'seed ABORTADO: exercicios ativos = % (esperado 73)', c; end if;
end $$;

with alvo(exercicio_id, slug, papel) as (values
  ('661386f5-0e86-4eb3-a452-ee215e4f4fb2'::uuid,'abdomen','primario'),
  ('661386f5-0e86-4eb3-a452-ee215e4f4fb2'::uuid,'obliquos','secundario'),
  ('046e185d-3fa6-43db-84e0-6b56f5eec2f9'::uuid,'abdomen','primario'),
  ('046e185d-3fa6-43db-84e0-6b56f5eec2f9'::uuid,'obliquos','secundario'),
  ('b3d63901-7ce2-455c-b966-391deb018272'::uuid,'quadriceps','primario'),
  ('b3d63901-7ce2-455c-b966-391deb018272'::uuid,'gluteos','primario'),
  ('b3d63901-7ce2-455c-b966-391deb018272'::uuid,'isquiotibiais','secundario'),
  ('b3d63901-7ce2-455c-b966-391deb018272'::uuid,'panturrilha','secundario'),
  ('e5c255a0-8e38-4d53-aef5-8cec39dfe82d'::uuid,'quadriceps','primario'),
  ('e5c255a0-8e38-4d53-aef5-8cec39dfe82d'::uuid,'gluteos','primario'),
  ('e5c255a0-8e38-4d53-aef5-8cec39dfe82d'::uuid,'isquiotibiais','secundario'),
  ('bdb1c3ac-153f-4433-893c-028be2a3adc3'::uuid,'quadriceps','primario'),
  ('bdb1c3ac-153f-4433-893c-028be2a3adc3'::uuid,'gluteos','primario'),
  ('bdb1c3ac-153f-4433-893c-028be2a3adc3'::uuid,'panturrilha','secundario'),
  ('bdb1c3ac-153f-4433-893c-028be2a3adc3'::uuid,'isquiotibiais','secundario'),
  ('f8b88f93-c706-4595-9457-3f8127e0ea2a'::uuid,'quadriceps','primario'),
  ('f8b88f93-c706-4595-9457-3f8127e0ea2a'::uuid,'gluteos','primario'),
  ('f8b88f93-c706-4595-9457-3f8127e0ea2a'::uuid,'abdomen','secundario'),
  ('f8b88f93-c706-4595-9457-3f8127e0ea2a'::uuid,'lombar','secundario'),
  ('2d3db2f0-b41a-4b24-b471-0d5017311d7c'::uuid,'quadriceps','primario'),
  ('2d3db2f0-b41a-4b24-b471-0d5017311d7c'::uuid,'gluteos','primario'),
  ('2d3db2f0-b41a-4b24-b471-0d5017311d7c'::uuid,'isquiotibiais','secundario'),
  ('2d3db2f0-b41a-4b24-b471-0d5017311d7c'::uuid,'lombar','secundario'),
  ('23e570d1-d117-48e4-a60d-79e69395434a'::uuid,'quadriceps','primario'),
  ('23e570d1-d117-48e4-a60d-79e69395434a'::uuid,'gluteos','primario'),
  ('23e570d1-d117-48e4-a60d-79e69395434a'::uuid,'adutores','secundario'),
  ('23e570d1-d117-48e4-a60d-79e69395434a'::uuid,'isquiotibiais','secundario'),
  ('5ed048fc-fdfd-42a4-a999-7e6cf0063b5b'::uuid,'dorsal','primario'),
  ('5ed048fc-fdfd-42a4-a999-7e6cf0063b5b'::uuid,'biceps','secundario'),
  ('5ed048fc-fdfd-42a4-a999-7e6cf0063b5b'::uuid,'trapezio','secundario'),
  ('d61f78f2-f621-46fc-a6bb-62f4e8960eb8'::uuid,'quadriceps','primario'),
  ('d61f78f2-f621-46fc-a6bb-62f4e8960eb8'::uuid,'isquiotibiais','secundario'),
  ('d61f78f2-f621-46fc-a6bb-62f4e8960eb8'::uuid,'panturrilha','secundario'),
  ('d61f78f2-f621-46fc-a6bb-62f4e8960eb8'::uuid,'gluteos','secundario'),
  ('776d8fa5-03da-4e23-8921-da0f6d48c0a6'::uuid,'quadriceps','primario'),
  ('776d8fa5-03da-4e23-8921-da0f6d48c0a6'::uuid,'peitoral','primario'),
  ('776d8fa5-03da-4e23-8921-da0f6d48c0a6'::uuid,'abdomen','secundario'),
  ('776d8fa5-03da-4e23-8921-da0f6d48c0a6'::uuid,'panturrilha','secundario'),
  ('776d8fa5-03da-4e23-8921-da0f6d48c0a6'::uuid,'deltoides','secundario'),
  ('776d8fa5-03da-4e23-8921-da0f6d48c0a6'::uuid,'triceps','secundario'),
  ('776d8fa5-03da-4e23-8921-da0f6d48c0a6'::uuid,'gluteos','secundario'),
  ('d77dae16-718a-4ed8-8b15-1f689d51c70d'::uuid,'quadriceps','primario'),
  ('51667ed6-1bc9-4801-9c07-bf2f48626066'::uuid,'peitoral','primario'),
  ('51667ed6-1bc9-4801-9c07-bf2f48626066'::uuid,'deltoides','secundario'),
  ('ee28820b-246c-4ca8-9fa8-949166967158'::uuid,'peitoral','primario'),
  ('ee28820b-246c-4ca8-9fa8-949166967158'::uuid,'deltoides','secundario'),
  ('1374b932-aada-485c-8034-154eb77389bc'::uuid,'peitoral','primario'),
  ('1374b932-aada-485c-8034-154eb77389bc'::uuid,'deltoides','secundario'),
  ('6404cc48-5bd1-4af1-90b6-40dd7c8cba09'::uuid,'deltoides','primario'),
  ('6404cc48-5bd1-4af1-90b6-40dd7c8cba09'::uuid,'trapezio','secundario'),
  ('2f824623-df47-4957-ae4d-46582b78dd64'::uuid,'abdomen','primario'),
  ('2f824623-df47-4957-ae4d-46582b78dd64'::uuid,'obliquos','secundario'),
  ('defc3174-26c9-4e59-88dd-b0f768e3f00e'::uuid,'deltoides','primario'),
  ('defc3174-26c9-4e59-88dd-b0f768e3f00e'::uuid,'triceps','secundario'),
  ('defc3174-26c9-4e59-88dd-b0f768e3f00e'::uuid,'trapezio','secundario'),
  ('f0d4e098-e398-4a46-8363-6077480d3d2a'::uuid,'deltoides','primario'),
  ('f0d4e098-e398-4a46-8363-6077480d3d2a'::uuid,'triceps','secundario'),
  ('f0d4e098-e398-4a46-8363-6077480d3d2a'::uuid,'trapezio','secundario'),
  ('6a752028-4154-4b4c-be7b-8480dac0cccf'::uuid,'deltoides','primario'),
  ('6a752028-4154-4b4c-be7b-8480dac0cccf'::uuid,'triceps','secundario'),
  ('6a752028-4154-4b4c-be7b-8480dac0cccf'::uuid,'abdomen','secundario'),
  ('6a752028-4154-4b4c-be7b-8480dac0cccf'::uuid,'trapezio','secundario'),
  ('f2f38ee2-6dda-4e27-bda1-fd3a6e938383'::uuid,'panturrilha','primario'),
  ('7140c9fd-742b-4f05-985f-ba54d8ef33d1'::uuid,'panturrilha','primario'),
  ('e921121b-f6e2-46d0-a082-cceb3245afb9'::uuid,'abdomen','primario'),
  ('e921121b-f6e2-46d0-a082-cceb3245afb9'::uuid,'obliquos','secundario'),
  ('a2f8438a-ffdc-45da-bfb8-a191fb2b1a24'::uuid,'deltoides','primario'),
  ('a2f8438a-ffdc-45da-bfb8-a191fb2b1a24'::uuid,'peitoral','secundario'),
  ('a950d07d-662f-4e0d-92fa-6096aed23252'::uuid,'deltoides','primario'),
  ('a950d07d-662f-4e0d-92fa-6096aed23252'::uuid,'trapezio','secundario'),
  ('9edd980e-aab9-4491-b6bf-d5714cd1a3fa'::uuid,'deltoides','primario'),
  ('9edd980e-aab9-4491-b6bf-d5714cd1a3fa'::uuid,'trapezio','secundario'),
  ('82787741-6508-4375-a4ae-9cc23b515ae0'::uuid,'gluteos','primario'),
  ('82787741-6508-4375-a4ae-9cc23b515ae0'::uuid,'isquiotibiais','secundario'),
  ('82787741-6508-4375-a4ae-9cc23b515ae0'::uuid,'quadriceps','secundario'),
  ('7f5ee3f1-c8d3-48e8-833c-b7368f5214ae'::uuid,'gluteos','primario'),
  ('7f5ee3f1-c8d3-48e8-833c-b7368f5214ae'::uuid,'isquiotibiais','secundario'),
  ('97cca114-c752-44e2-a21a-8ed1c2fc5477'::uuid,'trapezio','primario'),
  ('97cca114-c752-44e2-a21a-8ed1c2fc5477'::uuid,'antebraco','secundario'),
  ('b876ad86-6dc5-41b1-86e8-816d3717b5d8'::uuid,'gluteos','primario'),
  ('b876ad86-6dc5-41b1-86e8-816d3717b5d8'::uuid,'panturrilha','primario'),
  ('b876ad86-6dc5-41b1-86e8-816d3717b5d8'::uuid,'quadriceps','secundario'),
  ('b876ad86-6dc5-41b1-86e8-816d3717b5d8'::uuid,'isquiotibiais','secundario'),
  ('68c43d1b-18f4-4c2f-b4dd-0b4d96402985'::uuid,'deltoides','primario'),
  ('68c43d1b-18f4-4c2f-b4dd-0b4d96402985'::uuid,'trapezio','secundario'),
  ('cde2e28f-75bb-45ad-9e77-18309a6358ee'::uuid,'peitoral','primario'),
  ('cde2e28f-75bb-45ad-9e77-18309a6358ee'::uuid,'triceps','secundario'),
  ('cde2e28f-75bb-45ad-9e77-18309a6358ee'::uuid,'deltoides','secundario'),
  ('cde2e28f-75bb-45ad-9e77-18309a6358ee'::uuid,'abdomen','secundario'),
  ('8517085a-0f48-4c8b-9cca-f620624c6a80'::uuid,'peitoral','primario'),
  ('8517085a-0f48-4c8b-9cca-f620624c6a80'::uuid,'triceps','secundario'),
  ('8517085a-0f48-4c8b-9cca-f620624c6a80'::uuid,'deltoides','secundario'),
  ('2915646b-bf96-4c5b-996f-9eafda5f9c9e'::uuid,'triceps','primario'),
  ('2915646b-bf96-4c5b-996f-9eafda5f9c9e'::uuid,'peitoral','secundario'),
  ('2915646b-bf96-4c5b-996f-9eafda5f9c9e'::uuid,'deltoides','secundario'),
  ('2457dc0e-d411-466a-abd9-74ff1f5cfde9'::uuid,'isquiotibiais','primario'),
  ('2457dc0e-d411-466a-abd9-74ff1f5cfde9'::uuid,'gluteos','secundario'),
  ('2457dc0e-d411-466a-abd9-74ff1f5cfde9'::uuid,'lombar','secundario'),
  ('3e8e117e-310d-4748-95f6-118111b3ea96'::uuid,'quadriceps','primario'),
  ('3e8e117e-310d-4748-95f6-118111b3ea96'::uuid,'gluteos','primario'),
  ('3e8e117e-310d-4748-95f6-118111b3ea96'::uuid,'isquiotibiais','secundario'),
  ('19a37697-0146-4764-ab7e-6b0ae3875152'::uuid,'isquiotibiais','primario'),
  ('19a37697-0146-4764-ab7e-6b0ae3875152'::uuid,'gluteos','secundario'),
  ('19a37697-0146-4764-ab7e-6b0ae3875152'::uuid,'lombar','secundario'),
  ('19a37697-0146-4764-ab7e-6b0ae3875152'::uuid,'antebraco','secundario'),
  ('170ff467-f27d-4bc2-b2f7-5868935fe50c'::uuid,'triceps','primario'),
  ('170ff467-f27d-4bc2-b2f7-5868935fe50c'::uuid,'deltoides','secundario'),
  ('170ff467-f27d-4bc2-b2f7-5868935fe50c'::uuid,'peitoral','secundario'),
  ('6bfa4094-11e3-43a8-864e-924117ec69f6'::uuid,'isquiotibiais','primario'),
  ('6bfa4094-11e3-43a8-864e-924117ec69f6'::uuid,'panturrilha','secundario'),
  ('92d6a4cc-77c1-441f-8502-bc497047ba05'::uuid,'abdomen','primario'),
  ('92d6a4cc-77c1-441f-8502-bc497047ba05'::uuid,'obliquos','secundario'),
  ('92d6a4cc-77c1-441f-8502-bc497047ba05'::uuid,'deltoides','secundario'),
  ('c7632f0b-04c2-44d8-93d4-5248b2497935'::uuid,'obliquos','primario'),
  ('c7632f0b-04c2-44d8-93d4-5248b2497935'::uuid,'abdomen','secundario'),
  ('8e13f085-21ad-47d2-ba69-28fcc0257fba'::uuid,'panturrilha','primario'),
  ('8f441a96-d6cd-484d-9fd0-9cb2eb56718c'::uuid,'panturrilha','primario'),
  ('513f3b2e-3d6d-4c65-afd0-99a03b1d1175'::uuid,'quadriceps','primario'),
  ('513f3b2e-3d6d-4c65-afd0-99a03b1d1175'::uuid,'gluteos','primario'),
  ('513f3b2e-3d6d-4c65-afd0-99a03b1d1175'::uuid,'isquiotibiais','secundario'),
  ('513f3b2e-3d6d-4c65-afd0-99a03b1d1175'::uuid,'panturrilha','secundario'),
  ('68934767-5f07-4b74-a754-0aeb3d0f8c7b'::uuid,'abdomen','primario'),
  ('68934767-5f07-4b74-a754-0aeb3d0f8c7b'::uuid,'obliquos','secundario'),
  ('68934767-5f07-4b74-a754-0aeb3d0f8c7b'::uuid,'deltoides','secundario'),
  ('9cee3fd3-2583-484b-8114-1c8e2ad831a4'::uuid,'abdomen','primario'),
  ('9cee3fd3-2583-484b-8114-1c8e2ad831a4'::uuid,'obliquos','primario'),
  ('9cee3fd3-2583-484b-8114-1c8e2ad831a4'::uuid,'deltoides','secundario'),
  ('14c3ec91-3023-40ab-9fad-3127bfdc3287'::uuid,'obliquos','primario'),
  ('14c3ec91-3023-40ab-9fad-3127bfdc3287'::uuid,'gluteos','secundario'),
  ('cb1092e4-2699-445e-9399-2c6863f113cc'::uuid,'panturrilha','primario'),
  ('cb1092e4-2699-445e-9399-2c6863f113cc'::uuid,'quadriceps','secundario'),
  ('cb1092e4-2699-445e-9399-2c6863f113cc'::uuid,'antebraco','secundario'),
  ('b9ef7fc4-72bc-4a30-947f-da31a274d3a7'::uuid,'dorsal','primario'),
  ('b9ef7fc4-72bc-4a30-947f-da31a274d3a7'::uuid,'triceps','secundario'),
  ('9a336e4d-d783-4e07-bd1e-efbc12262300'::uuid,'dorsal','primario'),
  ('9a336e4d-d783-4e07-bd1e-efbc12262300'::uuid,'biceps','secundario'),
  ('9a336e4d-d783-4e07-bd1e-efbc12262300'::uuid,'trapezio','secundario'),
  ('33178ec7-df49-48de-88bf-87c2154b6ee9'::uuid,'dorsal','primario'),
  ('33178ec7-df49-48de-88bf-87c2154b6ee9'::uuid,'biceps','secundario'),
  ('33178ec7-df49-48de-88bf-87c2154b6ee9'::uuid,'trapezio','secundario'),
  ('2b072074-794a-4b69-9b8e-eb1dc2dad245'::uuid,'dorsal','primario'),
  ('2b072074-794a-4b69-9b8e-eb1dc2dad245'::uuid,'trapezio','primario'),
  ('2b072074-794a-4b69-9b8e-eb1dc2dad245'::uuid,'biceps','secundario'),
  ('2b072074-794a-4b69-9b8e-eb1dc2dad245'::uuid,'lombar','secundario'),
  ('20adbfa8-2871-4185-b7a3-46a92c684608'::uuid,'dorsal','primario'),
  ('20adbfa8-2871-4185-b7a3-46a92c684608'::uuid,'trapezio','primario'),
  ('20adbfa8-2871-4185-b7a3-46a92c684608'::uuid,'biceps','secundario'),
  ('20adbfa8-2871-4185-b7a3-46a92c684608'::uuid,'lombar','secundario'),
  ('6ca17cc5-5b78-43b9-85be-efebf3a86fc6'::uuid,'dorsal','primario'),
  ('6ca17cc5-5b78-43b9-85be-efebf3a86fc6'::uuid,'trapezio','primario'),
  ('6ca17cc5-5b78-43b9-85be-efebf3a86fc6'::uuid,'biceps','secundario'),
  ('6ca17cc5-5b78-43b9-85be-efebf3a86fc6'::uuid,'lombar','secundario'),
  ('6ca17cc5-5b78-43b9-85be-efebf3a86fc6'::uuid,'isquiotibiais','secundario'),
  ('45a72af4-8929-45a2-9bd8-f6c4e17ef2e0'::uuid,'dorsal','primario'),
  ('45a72af4-8929-45a2-9bd8-f6c4e17ef2e0'::uuid,'trapezio','primario'),
  ('45a72af4-8929-45a2-9bd8-f6c4e17ef2e0'::uuid,'biceps','secundario'),
  ('45a72af4-8929-45a2-9bd8-f6c4e17ef2e0'::uuid,'lombar','secundario'),
  ('45a72af4-8929-45a2-9bd8-f6c4e17ef2e0'::uuid,'isquiotibiais','secundario'),
  ('3468eea5-c0db-497c-a359-a5f380614adf'::uuid,'dorsal','primario'),
  ('3468eea5-c0db-497c-a359-a5f380614adf'::uuid,'biceps','secundario'),
  ('3468eea5-c0db-497c-a359-a5f380614adf'::uuid,'trapezio','secundario'),
  ('3468eea5-c0db-497c-a359-a5f380614adf'::uuid,'obliquos','secundario'),
  ('ae4f075f-1e0c-4685-849d-69a19b0e0c9a'::uuid,'biceps','primario'),
  ('ae4f075f-1e0c-4685-849d-69a19b0e0c9a'::uuid,'antebraco','secundario'),
  ('241b31f1-dfbf-4d66-9cf2-bc7106bb9938'::uuid,'biceps','primario'),
  ('241b31f1-dfbf-4d66-9cf2-bc7106bb9938'::uuid,'antebraco','secundario'),
  ('509e9457-e44f-4f6c-b059-fcbf38e56878'::uuid,'biceps','primario'),
  ('4cfc8e09-cbaa-48ab-aa99-a95b76f33dac'::uuid,'biceps','primario'),
  ('4cfc8e09-cbaa-48ab-aa99-a95b76f33dac'::uuid,'antebraco','secundario'),
  ('91b11f6e-93a4-4707-9b48-d30724aa1bab'::uuid,'biceps','primario'),
  ('91b11f6e-93a4-4707-9b48-d30724aa1bab'::uuid,'antebraco','secundario'),
  ('8ae781c1-022b-4f71-8a52-e671402e1788'::uuid,'biceps','primario'),
  ('8ae781c1-022b-4f71-8a52-e671402e1788'::uuid,'antebraco','secundario'),
  ('94459e12-d325-463b-8285-f8fd116f5264'::uuid,'obliquos','primario'),
  ('94459e12-d325-463b-8285-f8fd116f5264'::uuid,'abdomen','secundario'),
  ('bd90ddf0-1be1-4295-a1b1-4c1bfa1822c8'::uuid,'quadriceps','primario'),
  ('bd90ddf0-1be1-4295-a1b1-4c1bfa1822c8'::uuid,'gluteos','primario'),
  ('bd90ddf0-1be1-4295-a1b1-4c1bfa1822c8'::uuid,'isquiotibiais','secundario'),
  ('bd90ddf0-1be1-4295-a1b1-4c1bfa1822c8'::uuid,'panturrilha','secundario'),
  ('3afaf3d9-705e-41ec-b977-4b586a19d746'::uuid,'isquiotibiais','primario'),
  ('3afaf3d9-705e-41ec-b977-4b586a19d746'::uuid,'gluteos','secundario'),
  ('3afaf3d9-705e-41ec-b977-4b586a19d746'::uuid,'lombar','secundario'),
  ('378000ce-38b2-4eab-a849-fe64031fc293'::uuid,'peitoral','primario'),
  ('378000ce-38b2-4eab-a849-fe64031fc293'::uuid,'deltoides','secundario'),
  ('378000ce-38b2-4eab-a849-fe64031fc293'::uuid,'triceps','secundario'),
  ('92a20ed6-c394-42a9-bbfb-4eae4bcbbe02'::uuid,'peitoral','primario'),
  ('92a20ed6-c394-42a9-bbfb-4eae4bcbbe02'::uuid,'triceps','secundario'),
  ('92a20ed6-c394-42a9-bbfb-4eae4bcbbe02'::uuid,'deltoides','secundario'),
  ('bd53615a-bcd0-43b0-b9e6-2a3e806b2d14'::uuid,'peitoral','primario'),
  ('bd53615a-bcd0-43b0-b9e6-2a3e806b2d14'::uuid,'triceps','secundario'),
  ('bd53615a-bcd0-43b0-b9e6-2a3e806b2d14'::uuid,'deltoides','secundario'),
  ('aa34563c-7626-4df4-a2b0-7821d6259e24'::uuid,'isquiotibiais','primario'),
  ('aa34563c-7626-4df4-a2b0-7821d6259e24'::uuid,'gluteos','secundario'),
  ('aa34563c-7626-4df4-a2b0-7821d6259e24'::uuid,'obliquos','secundario'),
  ('aa34563c-7626-4df4-a2b0-7821d6259e24'::uuid,'lombar','secundario'),
  ('a5349cd0-4af5-479e-87ac-9887b6b1b80a'::uuid,'triceps','primario'),
  ('a5349cd0-4af5-479e-87ac-9887b6b1b80a'::uuid,'deltoides','secundario'),
  ('6d3248d9-6d36-4038-b8fe-90f3db821f5c'::uuid,'triceps','primario'),
  ('b4eedf12-cb7c-461f-8ea1-1de7d108a543'::uuid,'triceps','primario'),
  ('cdc004bf-8510-4972-b7d4-0a329fadee26'::uuid,'triceps','primario')
)
insert into public.exercicio_musculos (exercicio_id, musculo_id, papel)
select a.exercicio_id, m.id, a.papel
from alvo a join public.musculos m on m.slug = a.slug;

do $$
declare c int;
begin
  select count(*) into c from public.exercicio_musculos;
  if c <> 200 then raise exception 'seed ABORTADO pos-insert: % vinculos (esperado 200 — join perdeu slug?)', c; end if;
  select count(*) into c from public.exercicio_musculos where papel = 'primario';
  if c <> 89 then raise exception 'seed ABORTADO: % primarios (esperado 89)', c; end if;
  select count(distinct exercicio_id) into c from public.exercicio_musculos;
  if c <> 73 then raise exception 'seed ABORTADO: % exercicios mapeados (esperado 73)', c; end if;
  raise notice 'seed OK: 73 exercicios, 200 vinculos (89 primarios, 111 secundarios)';
end $$;

-- GUARDA DE IDENTIDADE: assinatura sha256 do conteudo (exercicio_id|slug|papel, ordenado).
-- Hash canonico aprovado pelo coach em 17/07/2026 — a aprovacao global refere-se a ESTE hash.
do $$
declare h text;
begin
  select encode(
    extensions.digest(
      string_agg(
        em.exercicio_id::text || '|' || m.slug || '|' || em.papel::text,
        E'\n'
        order by em.exercicio_id::text, m.slug, em.papel::text
      ),
      'sha256'
    ),
    'hex'
  ) into h
  from public.exercicio_musculos em
  join public.musculos m on m.id = em.musculo_id;
  if h is distinct from '3bbcde46a70016a255c1a3b4daa0a2f23791942b788f53226ae01d6958d116d4' then
    raise exception 'seed ABORTADO: hash de conteudo % difere do canonico aprovado 3bbcde46a70016a2…', coalesce(left(h,16),'NULL');
  end if;
  raise notice 'hash de conteudo confere com o canonico aprovado: 3bbcde46a70016a2…';
end $$;

rollback;
