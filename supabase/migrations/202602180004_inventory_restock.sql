create table if not exists inventory_restock_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  requested_qty numeric(12,3) not null,
  status text not null default 'OPEN',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_restock_requests_restaurant
  on inventory_restock_requests (restaurant_id, created_at desc);

create trigger trg_inventory_restock_requests_updated
before update on inventory_restock_requests
for each row execute function set_updated_at();

alter table inventory_restock_requests enable row level security;

create policy inventory_restock_requests_select on inventory_restock_requests
for select
using (is_super_admin() or restaurant_id = current_restaurant_id());

create policy inventory_restock_requests_insert on inventory_restock_requests
for insert
with check (is_super_admin() or restaurant_id = current_restaurant_id());

create policy inventory_restock_requests_update on inventory_restock_requests
for update
using (is_super_admin() or restaurant_id = current_restaurant_id())
with check (is_super_admin() or restaurant_id = current_restaurant_id());

create policy inventory_restock_requests_delete on inventory_restock_requests
for delete
using (is_super_admin() or restaurant_id = current_restaurant_id());
