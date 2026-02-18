alter table tables
  add column if not exists current_status text not null default 'AVAILABLE',
  add column if not exists assigned_staff_id uuid references staff(id);

create index if not exists idx_tables_restaurant_status on tables (restaurant_id, current_status);
create index if not exists idx_tables_assigned_staff on tables (assigned_staff_id);
