begin;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (storage_path ~ '^[a-f0-9-]{36}\.webp$'),
  uploader_name text not null check (length(trim(uploader_name)) between 1 and 80),
  caption text not null check (length(trim(caption)) between 1 and 1000),
  memory_date date,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index photos_status_created on public.photos(status,created_at desc,id desc);
create table public.site_settings (
  id smallint primary key default 1 check(id=1),
  site_title text not null default '12A2 — Chúng ta của những năm tháng ấy' check(length(trim(site_title)) between 1 and 150),
  site_subtitle text not null default 'Có những khoảnh khắc chỉ diễn ra một lần, nhưng sẽ ở lại mãi trong ký ức.' check(length(trim(site_subtitle)) between 1 and 350),
  welcome_message text not null default 'Mỗi bức ảnh, một câu chuyện của chúng mình.' check(length(trim(welcome_message)) between 1 and 240),
  footer_text text not null default 'Dành cho 12A2, với tất cả thương yêu.' check(length(trim(footer_text)) between 1 and 240),
  background_preset text not null default 'plum' check(background_preset in ('plum','forest','sepia')),
  background_image_path text check(background_image_path ~ '^[a-f0-9-]{36}\.webp$'),
  background_color text not null default '#382031' check(background_color ~ '^#[a-fA-F0-9]{6}$'),
  overlay_opacity int not null default 35 check(overlay_opacity between 0 and 90),
  music_path text check(music_path ~ '^[a-f0-9-]{36}\.mp3$'),
  music_enabled boolean not null default true,
  default_volume int not null default 35 check(default_volume between 0 and 100),
  floating_speed numeric not null default 1 check(floating_speed between 0.25 and 3),
  floating_intensity numeric not null default 1 check(floating_intensity between 0 and 2),
  floating_photo_size int not null default 100 check(floating_photo_size between 65 and 125),
  max_visible_photos int not null default 8 check(max_visible_photos between 1 and 12),
  shadow_intensity int not null default 50 check(shadow_intensity between 0 and 100),
  rotation_enabled boolean not null default true,
  floating_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values(1);
create table public.upload_limits (
  key text primary key, window_start timestamptz not null, hits int not null
);
create table public.asset_cleanup (
  bucket text not null check(bucket in ('memories','theme')),path text not null,
  created_at timestamptz not null default now(),primary key(bucket,path)
);

alter table public.photos enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.upload_limits enable row level security;
alter table public.asset_cleanup enable row level security;
revoke all on public.photos,public.site_settings,public.admin_users,public.upload_limits,public.asset_cleanup from public,anon,authenticated;
grant select on public.photos,public.site_settings to anon,authenticated;
grant select on public.admin_users to authenticated;
grant update(status,caption),delete on public.photos to authenticated;
grant update on public.site_settings to authenticated;
grant all on public.photos,public.site_settings,public.admin_users,public.upload_limits,public.asset_cleanup to service_role;

create policy self_membership on public.admin_users for select to authenticated using (user_id=(select auth.uid()));
create policy approved_photos on public.photos for select to anon,authenticated using (status='approved');
create policy moderator_read on public.photos for select to authenticated using (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy moderator_edit on public.photos for update to authenticated using (exists(select 1 from public.admin_users where user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy moderator_delete on public.photos for delete to authenticated using (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy read_settings on public.site_settings for select to anon,authenticated using(true);
create policy edit_settings on public.site_settings for update to authenticated using(exists(select 1 from public.admin_users where user_id=(select auth.uid()))) with check(exists(select 1 from public.admin_users where user_id=(select auth.uid())));

create function public.touch_memory_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=clock_timestamp(); return new; end $$;
create trigger photo_timestamp before update on public.photos for each row execute function public.touch_memory_updated_at();
create trigger settings_timestamp before update on public.site_settings for each row execute function public.touch_memory_updated_at();

-- Tệp cũ vẫn ở trong bucket riêng trong khi chờ dọn dẹp.
create function public.queue_retired_assets() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='photos' then
    insert into public.asset_cleanup(bucket,path) values ('memories',old.storage_path),('memories',replace(old.storage_path,'.webp','.small.webp')) on conflict do nothing;
    return old;
  end if;
  if old.music_path is not null and old.music_path is distinct from new.music_path then
    insert into public.asset_cleanup(bucket,path) values('theme',old.music_path) on conflict do nothing;
  end if;
  if old.background_image_path is not null and old.background_image_path is distinct from new.background_image_path then
    insert into public.asset_cleanup(bucket,path) values('theme',old.background_image_path) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.queue_retired_assets() from public,anon,authenticated;
create trigger cleanup_deleted_photo after delete on public.photos for each row execute function public.queue_retired_assets();
create trigger cleanup_replaced_asset after update on public.site_settings for each row execute function public.queue_retired_assets();

create function public.consume_upload_quota(p_key text) returns boolean language plpgsql set search_path='' as $$
declare allowed boolean;
begin
  delete from public.upload_limits where window_start < now()-interval '2 hours';
  insert into public.upload_limits as lim(key,window_start,hits) values(p_key,now(),1)
  on conflict(key) do update set
    hits=case when lim.window_start<=now()-interval '1 hour' then 1 else lim.hits+1 end,
    window_start=case when lim.window_start<=now()-interval '1 hour' then now() else lim.window_start end
    where lim.hits<12 or lim.window_start<=now()-interval '1 hour'
  returning true into allowed;
  return coalesce(allowed,false);
end $$;
revoke all on function public.consume_upload_quota(text) from public,anon,authenticated;
grant execute on function public.consume_upload_quota(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('memories','memories',false,4194304,array['image/webp']),('theme','theme',false,4194304,array['image/webp','audio/mpeg']);
-- Các chính sách hạn chế vẫn bảo vệ hai bucket nếu dự án có chính sách đọc/ghi chung.
create policy restrict_memory_object_access on storage.objects as restrictive for all to anon,authenticated
using(bucket_id not in ('memories','theme')) with check(bucket_id not in ('memories','theme'));
commit;
