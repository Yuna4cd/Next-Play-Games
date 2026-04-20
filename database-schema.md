# Database Schema

This document presents the final database schema for the Next Play Games project based on the Supabase SQL migrations in `backend/supabase/`.

## Platform

- Database: PostgreSQL via Supabase
- Extension used: `pgcrypto`
- Authentication dependency: `auth.users`

## Schema Overview

The application uses three main tables in the `public` schema:

1. `tasks`
2. `task_comments`
3. `task_activity`

These tables support task tracking, per-task discussion, and activity logging for authenticated users.

## Entity Relationships

- One user can own many tasks.
- One task can have many comments.
- One task can have many activity records.
- Each comment belongs to one task and one user.
- Each activity record belongs to one task and one user.

## Table Definitions

### 1. `public.tasks`

Stores the main task records displayed and managed in the application.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `title` | `text` | Not null |
| `status` | `text` | Not null, constrained to workflow values or generated custom status pattern |
| `user_id` | `uuid` | Not null, foreign key to `auth.users(id)`, `on delete cascade` |
| `created_at` | `timestamptz` | Not null, default `now()` |
| `description` | `text` | Nullable |
| `priority` | `text` | Not null, default `'normal'`, allowed values: `low`, `normal`, `high`, `done` |
| `due_date` | `date` | Nullable |
| `assignee_name` | `text` | Nullable |
| `tag` | `text` | Nullable |
| `completed` | `boolean` | Not null, default `false` |

#### Constraints

- Primary key: `id`
- Foreign key: `user_id -> auth.users(id)`
- Check constraint on `status`:
  - allowed fixed values: `todo`, `in_progress`, `in_review`, `done`
  - or a custom generated format matching `^[a-z0-9_]+_[0-9]+$`
- Check constraint on `priority`:
  - allowed values: `low`, `normal`, `high`, `done`

#### Indexes

- `tasks_user_id_idx` on `user_id`
- `tasks_status_idx` on `status`
- `tasks_created_at_idx` on `created_at desc`

### 2. `public.task_comments`

Stores comments attached to tasks.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `task_id` | `uuid` | Not null, foreign key to `public.tasks(id)`, `on delete cascade` |
| `user_id` | `uuid` | Not null, foreign key to `auth.users(id)`, `on delete cascade` |
| `author` | `text` | Not null |
| `message` | `text` | Not null |
| `created_at` | `timestamptz` | Not null, default `now()` |

#### Constraints

- Primary key: `id`
- Foreign key: `task_id -> public.tasks(id)`
- Foreign key: `user_id -> auth.users(id)`

#### Indexes

- `task_comments_task_id_idx` on `task_id`
- `task_comments_user_id_idx` on `user_id`
- `task_comments_created_at_idx` on `created_at asc`

### 3. `public.task_activity`

Stores task history and activity events.

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `task_id` | `uuid` | Not null, foreign key to `public.tasks(id)`, `on delete cascade` |
| `user_id` | `uuid` | Not null, foreign key to `auth.users(id)`, `on delete cascade` |
| `actor` | `text` | Not null |
| `action_type` | `text` | Not null |
| `metadata` | `jsonb` | Not null, default `'{}'::jsonb` |
| `created_at` | `timestamptz` | Not null, default `now()` |

#### Constraints

- Primary key: `id`
- Foreign key: `task_id -> public.tasks(id)`
- Foreign key: `user_id -> auth.users(id)`

#### Indexes

- `task_activity_task_id_idx` on `task_id`
- `task_activity_user_id_idx` on `user_id`
- `task_activity_created_at_idx` on `created_at desc`

## Row-Level Security

Row-level security is enabled on all three public tables:

- `public.tasks`
- `public.task_comments`
- `public.task_activity`

For each table, authenticated users have policies allowing them to:

- `SELECT` their own records
- `INSERT` their own records
- `UPDATE` their own records
- `DELETE` their own records

Ownership is enforced through:

- `auth.uid() = user_id`

## Final Consolidated SQL Schema

```sql
create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null check (
    status in ('todo', 'in_progress', 'in_review', 'done')
    or status ~ '^[a-z0-9_]+_[0-9]+$'
  ),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'done')),
  due_date date,
  assignee_name text,
  tag text,
  completed boolean not null default false
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

alter table public.tasks enable row level security;

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
on public.tasks
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own tasks" on public.tasks;
create policy "Users can insert their own tasks"
on public.tasks
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
on public.tasks
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
on public.tasks
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

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
```

## Source

This final schema was consolidated from:

- `backend/supabase/001_tasks_schema.sql`
- `backend/supabase/002_task_comments_and_constraints.sql`
