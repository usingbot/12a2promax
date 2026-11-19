-- Nâng hạn mức gửi ảnh từ 12 lên 500 lượt/giờ/IP.
-- Chạy sau migration 202611190001_vintage_memories.sql.
-- Có thể chạy trên database đã được khởi tạo trước đó.
begin;

create or replace function public.consume_upload_quota(p_key text)
returns boolean
language plpgsql
set search_path=''
as $$
declare
  allowed boolean;
begin
  delete from public.upload_limits
  where window_start < now() - interval '2 hours';

  insert into public.upload_limits as lim(key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case
      when lim.window_start <= now() - interval '1 hour' then 1
      else lim.hits + 1
    end,
    window_start = case
      when lim.window_start <= now() - interval '1 hour' then now()
      else lim.window_start
    end
  where lim.hits < 500
     or lim.window_start <= now() - interval '1 hour'
  returning true into allowed;

  return coalesce(allowed, false);
end
$$;

revoke all on function public.consume_upload_quota(text)
from public, anon, authenticated;
grant execute on function public.consume_upload_quota(text) to service_role;

commit;
