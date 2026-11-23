-- Imagens anexadas às demandas.
-- Os dados de cada imagem (id, nome, tamanho) ficam numa coluna da demanda; o arquivo fica no Storage,
-- no balde privado "imagens", numa pasta por usuário: <user_id>/<id da imagem>.

alter table public.demandas
  add column if not exists imagens jsonb not null default '[]'::jsonb check (jsonb_typeof(imagens) = 'array');

-- balde privado; o app já manda a imagem reduzida (até 1600 px), então 5 MB sobra
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- cada usuário só lê, grava e apaga dentro da própria pasta
create policy "imagens: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "imagens: dono grava" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "imagens: dono atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "imagens: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
