alter table public.tasks
  add column if not exists description text,
  add column if not exists completed boolean not null default false;

alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (
    status in ('todo', 'in_progress', 'in_review', 'done')
    or status ~ '^[a-z0-9_]+_[0-9]+$'
  );

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_idx on public.task_comments (task_id);
create index if not exists task_comments_user_id_idx on public.task_comments (user_id);
create index if not exists task_comments_created_at_idx on public.task_comments (created_at asc);

alter table public.task_comments enable row level security;

drop policy if exists "Users can view their own task comments" on public.task_comments;
create policy "Users can view their own task comments"
on public.task_comments
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own task comments" on public.task_comments;
create policy "Users can insert their own task comments"
on public.task_comments
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own task comments" on public.task_comments;
create policy "Users can update their own task comments"
on public.task_comments
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own task comments" on public.task_comments;
create policy "Users can delete their own task comments"
on public.task_comments
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create table if not exists public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  actor text not null,
  action_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists task_activity_task_id_idx on public.task_activity (task_id);
create index if not exists task_activity_user_id_idx on public.task_activity (user_id);
create index if not exists task_activity_created_at_idx on public.task_activity (created_at desc);

alter table public.task_activity enable row level security;

drop policy if exists "Users can view their own task activity" on public.task_activity;
create policy "Users can view their own task activity"
on public.task_activity
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own task activity" on public.task_activity;
create policy "Users can insert their own task activity"
on public.task_activity
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own task activity" on public.task_activity;
create policy "Users can update their own task activity"
on public.task_activity
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own task activity" on public.task_activity;
create policy "Users can delete their own task activity"
on public.task_activity
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
