create table if not exists staff_shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, staff_id, day_of_week, start_time, end_time)
);

create index if not exists idx_staff_shifts_restaurant on staff_shifts (restaurant_id, day_of_week);
create trigger trg_staff_shifts_updated before update on staff_shifts for each row execute function set_updated_at();

alter table staff_shifts enable row level security;

create policy staff_shifts_select on staff_shifts
for select using (is_super_admin() or restaurant_id = current_restaurant_id());

create policy staff_shifts_insert on staff_shifts
for insert with check (is_super_admin() or restaurant_id = current_restaurant_id());

create policy staff_shifts_update on staff_shifts
for update using (is_super_admin() or restaurant_id = current_restaurant_id())
with check (is_super_admin() or restaurant_id = current_restaurant_id());

create policy staff_shifts_delete on staff_shifts
for delete using (is_super_admin() or restaurant_id = current_restaurant_id());
