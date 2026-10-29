-- Apply to a dedicated Supabase project. Do not apply to the prospecting database.
create table public.shops(id uuid primary key default gen_random_uuid(), name text not null);
create table public.shop_members(shop_id uuid references public.shops on delete cascade,user_id uuid references auth.users on delete cascade,active boolean not null default true,primary key(shop_id,user_id));
create function public.is_shop_admin(p_shop uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from shop_members where shop_id=p_shop and user_id=auth.uid() and active) $$;
revoke all on function public.is_shop_admin(uuid) from public;
grant execute on function public.is_shop_admin(uuid) to anon,authenticated;
create table public.catalog_items(id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops,kind text not null check(kind in ('product','service')),slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),state text not null default 'draft' check(state in ('draft','published','archived')),version integer not null default 1,updated_at timestamptz not null default now(),updated_by uuid references auth.users,unique(shop_id,kind,slug),unique(id,shop_id));
create table public.item_drafts(item_id uuid primary key references public.catalog_items on delete cascade,content jsonb not null,featured boolean not null default false,sort_order integer not null default 0);
create table public.item_publications(item_id uuid primary key references public.catalog_items on delete cascade,shop_id uuid not null references public.shops,kind text not null,slug text not null,content jsonb not null,featured boolean not null,sort_order integer not null,published_at timestamptz not null default now());
alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.catalog_items enable row level security;
alter table public.item_drafts enable row level security;
alter table public.item_publications enable row level security;
create policy shop_read on public.shops for select using(true);
create policy member_read on public.shop_members for select to authenticated using(user_id=auth.uid());
create policy item_admin on public.catalog_items for select to authenticated using(public.is_shop_admin(shop_id));
create policy draft_admin on public.item_drafts for select to authenticated using(exists(select 1 from public.catalog_items i where i.id=item_id and public.is_shop_admin(i.shop_id)));
create policy publication_read on public.item_publications for select using(true);
grant select on public.shops,public.item_publications to anon,authenticated;
grant select on public.shop_members,public.catalog_items,public.item_drafts to authenticated;
-- Mutations run only through functions with explicit membership and version checks.
create function public.save_item(p_item_id uuid,p_shop_id uuid,p_kind text,p_slug text,p_content jsonb,p_featured boolean,p_sort_order integer,p_expected_version integer) returns public.catalog_items language plpgsql security definer set search_path=public as $$
declare row_item catalog_items; image_path text;
begin
 if not public.is_shop_admin(p_shop_id) then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_content->>'title','')))<2 or length(coalesce(p_content->>'title',''))>160 then raise exception 'Título deve ter entre 2 e 160 caracteres'; end if;
 if length(coalesce(p_content->>'description',''))>20000 or length(coalesce(p_content->>'summary',''))>500 then raise exception 'Conteúdo muito longo'; end if;
 if p_content->>'priceCents' is not null and ((p_content->>'priceCents')::numeric<0 or (p_content->>'priceCents')::numeric<>trunc((p_content->>'priceCents')::numeric)) then raise exception 'Preço inválido'; end if;
 image_path=p_content->>'imagePath';
 if coalesce(image_path,'')<>'' and split_part(image_path,'/',1)<>p_shop_id::text then raise exception 'Imagem de outra loja'; end if;
 if p_item_id is null then
   insert into catalog_items(shop_id,kind,slug,updated_by) values(p_shop_id,p_kind,p_slug,auth.uid()) returning * into row_item;
 else
   select * into row_item from catalog_items where id=p_item_id and shop_id=p_shop_id for update;
   if not found then raise exception 'NOT_FOUND'; end if;
   if row_item.version<>p_expected_version then raise exception 'CONFLICT: recarregue antes de salvar'; end if;
   if exists(select 1 from item_publications where item_id=p_item_id) and (row_item.slug<>p_slug or row_item.kind<>p_kind) then raise exception 'Tipo e endereço não podem mudar após publicação'; end if;
   update catalog_items set kind=p_kind,slug=p_slug,version=version+1,updated_at=now(),updated_by=auth.uid() where id=p_item_id returning * into row_item;
 end if;
 insert into item_drafts values(row_item.id,p_content,p_featured,p_sort_order) on conflict(item_id) do update set content=excluded.content,featured=excluded.featured,sort_order=excluded.sort_order;
 return row_item;
end $$;
create function public.publish_item(p_item_id uuid,p_expected_version integer) returns void language plpgsql security definer set search_path=public as $$
declare i catalog_items; d item_drafts;
begin
 select * into i from catalog_items where id=p_item_id for update;
 if not found or not public.is_shop_admin(i.shop_id) then raise exception 'FORBIDDEN'; end if;
 if i.version<>p_expected_version then raise exception 'CONFLICT'; end if;
 select * into d from item_drafts where item_id=i.id;
 if length(trim(coalesce(d.content->>'summary','')))=0 or length(trim(coalesce(d.content->>'description','')))=0 or length(trim(coalesce(d.content->>'imageAlt','')))=0 or length(trim(coalesce(d.content->>'imagePath','')))=0 then raise exception 'Preencha resumo, descrição, foto e texto alternativo'; end if;
 if not exists(select 1 from storage.objects where bucket_id='catalog' and name=d.content->>'imagePath') then raise exception 'Foto não encontrada'; end if;
 insert into item_publications values(i.id,i.shop_id,i.kind,i.slug,d.content,d.featured,d.sort_order,now()) on conflict(item_id) do update set content=excluded.content,featured=excluded.featured,sort_order=excluded.sort_order,published_at=now();
 update catalog_items set state='published',version=version+1,updated_at=now(),updated_by=auth.uid() where id=i.id;
end $$;
create function public.unpublish_item(p_item_id uuid,p_expected_version integer,p_archive boolean default false) returns void language plpgsql security definer set search_path=public as $$
declare i catalog_items;
begin
 select * into i from catalog_items where id=p_item_id for update;
 if not found or not public.is_shop_admin(i.shop_id) then raise exception 'FORBIDDEN'; end if;
 if i.version<>p_expected_version then raise exception 'CONFLICT'; end if;
 delete from item_publications where item_id=i.id;
 update catalog_items set state=case when p_archive then 'archived' else 'draft' end,version=version+1,updated_at=now(),updated_by=auth.uid() where id=i.id;
end $$;
revoke all on function public.save_item(uuid,uuid,text,text,jsonb,boolean,integer,integer), public.publish_item(uuid,integer),public.unpublish_item(uuid,integer,boolean) from public;
grant execute on function public.save_item(uuid,uuid,text,text,jsonb,boolean,integer,integer), public.publish_item(uuid,integer),public.unpublish_item(uuid,integer,boolean) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalog','catalog',false,8388608,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
create policy catalog_upload on storage.objects for insert to authenticated with check(bucket_id='catalog' and exists(select 1 from public.shop_members m where m.shop_id::text=split_part(name,'/',1) and m.user_id=auth.uid() and m.active));
create policy catalog_admin_read on storage.objects for select to authenticated using(bucket_id='catalog' and exists(select 1 from public.shop_members m where m.shop_id::text=split_part(name,'/',1) and m.user_id=auth.uid() and m.active));
create policy catalog_public_read on storage.objects for select to anon using(bucket_id='catalog' and exists(select 1 from public.item_publications p where p.content->>'imagePath'=name));
insert into public.shops(id,name) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','House Pisos e Porcelanatos');
-- Invite the owner through Supabase Auth. Then run with a trusted database role:
-- insert into public.shop_members(shop_id,user_id) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','OWNER_AUTH_UUID');
