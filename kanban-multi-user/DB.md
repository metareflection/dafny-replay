```
  create table projects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    owner_email text not null,
    state jsonb not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create index projects_owner_idx on projects(owner_email);
  ```