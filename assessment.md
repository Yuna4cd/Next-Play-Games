# Internship Assessment — Software Development
## Kanban Task Board — Full-Stack Challenge

## Overview
Build a polished, full-featured **Kanban-style task board** where users can create tasks, move them across columns with drag-and-drop, and manage work visually. The brief explicitly references products like **Asana**, **Linear**, and **Notion** as design inspiration. The app should feel production-quality rather than like a basic todo app. :contentReference[oaicite:1]{index=1}

## Time and Cost Constraints
- Expected completion time: **3–6 hours**
- Maximum suggested time if unfamiliar with the stack: **12 hours**
- Budget: **$0**
- Use only **free tiers** for required services. :contentReference[oaicite:2]{index=2}

## Required Tech
- **Supabase** (Free Tier) for database and authentication
- **GitHub** (Free Tier) for version control and code sharing :contentReference[oaicite:3]{index=3}

## Optional Languages / Frameworks
You may use the tools you are strongest with. Suggested options:
- React / React Native
- TypeScript
- Go for a backend API (optional) :contentReference[oaicite:4]{index=4}

## Design Expectations
Design is a major evaluation criterion. The brief emphasizes visual polish and a modern, intentional interface. The assessment is not only about functionality.

Key design priorities:
- Cohesive color palette
- Clear typography system
- Strong visual hierarchy between columns and task cards
- Smooth drag-and-drop interactions
- Thoughtful empty states
- Clear loading states
- Clear error states
- Mobile-friendly or responsive design is a plus :contentReference[oaicite:5]{index=5}

## Required Board Functionality
The application must include a **Kanban board** with these default columns:
- To Do
- In Progress
- In Review
- Done

Users must be able to:
- View the board with these columns
- Drag tasks between columns
- Update task status through drag-and-drop
- See the board update in real time or immediately on drop :contentReference[oaicite:6]{index=6}

## Database Requirements
Use **Supabase** and create a `tasks` table.

Required fields:
- `id` — `uuid` — primary key
- `title` — `text` — required
- `status` — `text` — allowed values: `todo`, `in_progress`, `in_review`, `done`
- `user_id` — `uuid` — tied to guest session
- `created_at` — `timestamp` — auto-set

Recommended bonus fields:
- `description` — `text`
- `priority` — low / normal / high
- `due_date` — `date`
- `assignee_id` — `uuid`, references a team member

All tasks must persist in Supabase, and **Row Level Security (RLS)** must be enabled. The table structure is shown explicitly in the page 3 database section of the PDF. :contentReference[oaicite:7]{index=7}

## Guest Accounts Requirement
The app must support **guest accounts** so each user only sees their own tasks.

Required behavior:
- Use **Supabase Auth anonymous sign-in**
- Automatically create a guest session on first app launch
- Store each task with the `user_id` of the guest user
- Use **RLS** so users can only read and write their own data

Expected isolation behavior:
- User A only sees User A’s tasks
- User B only sees User B’s tasks :contentReference[oaicite:8]{index=8}

## Frontend Requirements
You must build either:
- a **web frontend**, or
- a **React Native app**

The frontend must allow users to:
- View the board and its columns
- Create a new task
- Optionally include description, priority, and due date when creating a task
- Drag tasks between columns to update status
- Clearly see loading states
- Clearly see error states :contentReference[oaicite:9]{index=9}

## Advanced Features (Optional but Strongly Recommended)
These are not required, but the brief states they are highly recommended and can make the submission stand out.

### 1. Team Members & Assignees
- Allow users to add team members
- A team member can include a name and optional avatar or color
- Show team members in the board UI
- Allow assigning one or more team members to a task
- Display assignee avatars on task cards

### 2. Task Comments
- Allow users to open a task detail panel
- Add comments to a task
- Show comments in chronological order with timestamps
- Store comments in a separate Supabase `comments` table

### 3. Task Activity Log
- Track task changes such as:
  - status changes
  - edits
  - assignments
- Show a timeline in task detail view
- Example in brief: “Moved from To Do → In Progress · 2 hours ago”

### 4. Labels / Tags
- Allow custom labels such as `Bug`, `Feature`, `Design`
- Allow multiple labels per task
- Filter the board by label

### 5. Due Date Indicators
- Highlight tasks due soon or overdue
- Show a visual urgency indicator, such as a badge or icon

### 6. Search & Filtering
- Search tasks by title
- Add filters for priority, assignee, or label

### 7. Board Summary / Stats
- Show summary metrics such as:
  - total tasks
  - completed tasks
  - overdue tasks
- Could be placed in a header or sidebar :contentReference[oaicite:10]{index=10}

## Backend
Backend is optional.

You may either:
- Call Supabase directly from the frontend, or
- Build a small API, with Go listed as an optional choice, to:
  - get tasks
  - create tasks
  - update tasks :contentReference[oaicite:11]{index=11}

## Hosting Requirement
You must deploy the frontend and provide a **live demo URL**.

Suggested free hosting options:
- Vercel
- Netlify
- Cloudflare Pages

The live URL must be included in the final document. :contentReference[oaicite:12]{index=12}

## Access and Sharing Requirements
### GitHub
- Share the repo publicly, or
- Share a private repo link directly
- No collaborator invite is required

### Supabase
- Provide read-only visibility into the schema by including:
  - the full SQL schema in the final document, or
  - a screenshot of the table structure from Supabase

### Security
- Do **not** share the Supabase service role key
- Use only the **public anon key** in the frontend
- Do **not** commit secrets to GitHub :contentReference[oaicite:13]{index=13}

## Final Deliverable
Submit a **PDF or DOCX** named:

`firstname_lastname_task_manager_assessment.pdf`

The final document must include:
- A short overview of the solution
- Design decisions
- Link to the live frontend app
- Link to the GitHub repository
- Full database schema (SQL or a clear description)
- Setup instructions for local development
- Which advanced features were built, if any
- Explanation of how those advanced features work
- Tradeoffs
- What would be improved with more time :contentReference[oaicite:14]{index=14}

## Evaluation Criteria
The submission will be evaluated on:
- Design quality
- Board functionality
- Frontend usability and state handling
- Database schema and persistence
- Security awareness, especially RLS and secret handling
- Advanced features
- Code quality and structure
- Live app execution
- Clarity of the final document :contentReference[oaicite:15]{index=15}

## Practical Build Priorities
A strong implementation should prioritize the following:
1. Anonymous guest auth with Supabase
2. Secure per-user task isolation using RLS
3. Functional Kanban board with drag-and-drop
4. Clean task creation flow
5. Persistent task storage
6. High-quality UI design
7. Reliable loading, empty, and error states
8. Deployment to a live URL
9. Clear final documentation

## Recommended MVP Scope
A solid minimum submission would include:
- Anonymous sign-in on first load
- Supabase `tasks` table with RLS
- Four required columns
- Create task modal or form
- Drag-and-drop task movement
- Responsive board layout
- Deployed frontend
- Public or shareable GitHub repo
- Final PDF/DOCX with schema and setup steps

## Strong Differentiators
To stand out, add one or more of the following:
- Assignees with avatars
- Comments panel
- Activity timeline
- Labels and filters
- Search
- Due-date badges
- Summary stats dashboard
- Particularly refined visual design and interactions :contentReference[oaicite:16]{index=16}