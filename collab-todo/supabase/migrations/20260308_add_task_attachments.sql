-- Task attachments table
create table if not exists task_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id integer not null,
  type text not null check (type in ('file', 'link', 'markdown')),
  name text not null,
  url text,
  content text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Index for fast lookups
create index if not exists idx_task_attachments_project_task
  on task_attachments(project_id, task_id);

-- RLS policies
alter table task_attachments enable row level security;

-- Members of the project can view attachments
create policy "Project members can view attachments"
  on task_attachments for select
  using (
    exists (
      select 1 from project_members
      where project_members.project_id = task_attachments.project_id
        and project_members.user_id = auth.uid()
    )
  );

-- Authenticated users who are project members can insert
create policy "Project members can add attachments"
  on task_attachments for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from project_members
      where project_members.project_id = task_attachments.project_id
        and project_members.user_id = auth.uid()
    )
  );

-- Only the creator can update their own attachments
create policy "Creators can update own attachments"
  on task_attachments for update
  using (auth.uid() = created_by);

-- Only the creator can delete their own attachments
create policy "Creators can delete own attachments"
  on task_attachments for delete
  using (auth.uid() = created_by);

-- Storage bucket for file uploads
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Project members can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'task-attachments'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can view attachment files"
  on storage.objects for select
  using (bucket_id = 'task-attachments');

create policy "Owners can delete their files"
  on storage.objects for delete
  using (
    bucket_id = 'task-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
