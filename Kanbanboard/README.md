# Next Play Kanban Board

A polished Kanban-style task board built with React, Vite, and Supabase. It supports:

- default columns: `To Do`, `In Progress`, `In Review`, `Done`
- drag-and-drop task movement
- guest sessions via Supabase anonymous auth
- row-level security per guest user
- task creation with title, description, priority, due date, tag, and assignee
- task detail modal with completion tracking and persisted comments
- search and filters for tag, priority, and assignee

## Local Setup

1. Install frontend dependencies:

```bash
cd Kanbanboard
npm install
```

2. Create a Supabase project.

3. In Supabase Authentication, enable `Anonymous Sign-Ins`.

4. Run the SQL in this order:

- `../backend/supabase/001_tasks_schema.sql`
- `../backend/supabase/002_task_comments_and_constraints.sql` if you previously ran an older version of the schema

5. Create `Kanbanboard/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

6. Start the app:

```bash
npm run dev
```

## Notes

- If the app cannot connect to Supabase, it shows a visible banner and falls back to local demo data.
- Tasks are stored in `public.tasks`.
- Comments are stored in `public.task_comments`.
- Every task and comment row is scoped by `user_id`, and RLS prevents users from reading or writing other users' data.

## Assessment Features Implemented

- Beautiful Kanban board UI
- Drag-and-drop between columns
- Supabase persistence with anonymous auth
- Row-level security
- Task details modal
- Task comments
- Search and filter controls
- Responsive layout

## Known Tradeoffs

- Extra columns are created client-side and are not yet persisted as their own Supabase table.
- Assignees are stored as display names rather than a separate team-member relation.
