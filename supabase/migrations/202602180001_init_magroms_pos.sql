create extension if not exists pgcrypto;

create type user_role as enum (
  'SUPER_ADMIN',
  'RESTAURANT_ADMIN',
  'MANAGER',
  'CASHIER',
  'WAITER',
  'KITCHEN',
  'INVENTORY',
  'CUSTOMER'
);

create type restaurant_status as enum ('ACTIVE', 'SUSPENDED', 'PENDING_SETUP');
create type order_channel as enum ('POS', 'PREORDER');
create type order_status as enum ('OPEN', 'KITCHEN', 'READY', 'COMPLETED', 'CANCELLED');
create type priority_level as enum ('NORMAL', 'HIGH');
create type payment_method as enum ('CASH', 'CARD', 'UPI', 'WALLET');
create type payment_status as enum ('SUCCESS', 'FAILED', 'PENDING');
create type deployment_status as enum ('QUEUED', 'BUILDING', 'READY', 'FAILED');
create type feature_source as enum ('BUNDLE', 'OVERRIDE');
create type loyalty_type as enum ('EARN', 'REDEEM', 'ADJUST');

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists feature_bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  price_monthly numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  bundle_id uuid not null references feature_bundles(id),
  timezone text not null default 'America/New_York',
  currency text not null default 'USD',
  status restaurant_status not null default 'PENDING_SETUP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  feature_name text not null,
  is_enabled boolean not null,
  source feature_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, feature_name)
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null,
  role user_role not null,
  full_name text not null,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  capacity int not null,
  zone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  is_available boolean not null default true,
  sku text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid references tables(id),
  customer_id uuid,
  order_number text not null,
  channel order_channel not null,
  status order_status not null default 'OPEN',
  subtotal_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  priority priority_level not null default 'NORMAL',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, order_number)
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  payment_method payment_method not null,
  amount numeric(10,2) not null,
  status payment_status not null,
  reference_code text,
  created_at timestamptz not null default now()
);

create table if not exists inventory_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references inventory_categories(id) on delete cascade,
  name text not null,
  unit text not null,
  current_stock numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 0,
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists menu_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  qty_per_menu_item numeric(12,3) not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, menu_item_id, inventory_item_id)
);

create table if not exists inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id),
  alert_type text not null,
  message text not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists inventory_wastage (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id),
  quantity numeric(12,3) not null,
  reason text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  visit_count int not null default 0,
  loyalty_balance int not null default 0,
  total_spend numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, email)
);

create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  points int not null,
  transaction_type loyalty_type not null,
  source text not null,
  created_at timestamptz not null default now()
);

create table if not exists preorders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid references customers(id),
  linked_order_id uuid references orders(id),
  pickup_at timestamptz not null,
  status text not null default 'PENDING',
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists preorder_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  preorder_id uuid not null references preorders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null,
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists deployments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  provider text not null,
  environment text not null,
  status deployment_status not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feature_flags_restaurant on feature_flags (restaurant_id, feature_name);
create index if not exists idx_staff_restaurant on staff (restaurant_id, role);
create index if not exists idx_orders_restaurant_created on orders (restaurant_id, created_at desc);
create index if not exists idx_order_items_order on order_items (order_id);
create index if not exists idx_inventory_items_restaurant on inventory_items (restaurant_id);
create index if not exists idx_customers_restaurant on customers (restaurant_id, email);
create index if not exists idx_preorders_restaurant on preorders (restaurant_id, pickup_at desc);
create index if not exists idx_audit_logs_restaurant on audit_logs (restaurant_id, created_at desc);

create trigger trg_feature_bundles_updated before update on feature_bundles for each row execute function set_updated_at();
create trigger trg_restaurants_updated before update on restaurants for each row execute function set_updated_at();
create trigger trg_feature_flags_updated before update on feature_flags for each row execute function set_updated_at();
create trigger trg_staff_updated before update on staff for each row execute function set_updated_at();
create trigger trg_tables_updated before update on tables for each row execute function set_updated_at();
create trigger trg_menu_categories_updated before update on menu_categories for each row execute function set_updated_at();
create trigger trg_menu_items_updated before update on menu_items for each row execute function set_updated_at();
create trigger trg_orders_updated before update on orders for each row execute function set_updated_at();
create trigger trg_inventory_categories_updated before update on inventory_categories for each row execute function set_updated_at();
create trigger trg_inventory_items_updated before update on inventory_items for each row execute function set_updated_at();
create trigger trg_customers_updated before update on customers for each row execute function set_updated_at();
create trigger trg_preorders_updated before update on preorders for each row execute function set_updated_at();
create trigger trg_deployments_updated before update on deployments for each row execute function set_updated_at();

insert into feature_bundles (name, description, price_monthly)
values
  ('Starter', 'Core POS, KDS, inventory, basic analytics', 79),
  ('Pro', 'Advanced analytics, CRM+preorder sync, automation', 199),
  ('Enterprise', 'AI + enterprise security and integrations', 499)
on conflict (name) do update
set description = excluded.description,
    price_monthly = excluded.price_monthly,
    updated_at = now();

create or replace function current_user_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', auth.jwt() -> 'app_metadata' ->> 'role', 'CUSTOMER');
$$;

create or replace function current_restaurant_id()
returns uuid
language sql
stable
as $$
  select nullif(coalesce(auth.jwt() ->> 'restaurant_id', auth.jwt() -> 'app_metadata' ->> 'restaurant_id', ''), '')::uuid;
$$;

create or replace function is_super_admin()
returns boolean
language sql
stable
as $$
  select current_user_role() = 'SUPER_ADMIN';
$$;

create or replace function has_feature(input_restaurant_id uuid, input_feature_name text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from feature_flags
    where restaurant_id = input_restaurant_id
      and feature_name = input_feature_name
      and is_enabled = true
  );
$$;

create or replace function best_selling_items(input_restaurant_id uuid)
returns table(menu_item_id uuid, item_name text, quantity_sold bigint)
language sql
stable
as $$
  select oi.menu_item_id, mi.name, sum(oi.quantity)::bigint
  from order_items oi
  join menu_items mi on mi.id = oi.menu_item_id
  join orders o on o.id = oi.order_id
  where oi.restaurant_id = input_restaurant_id
    and o.status = 'COMPLETED'
  group by oi.menu_item_id, mi.name
  order by sum(oi.quantity) desc
  limit 10;
$$;

create or replace function peak_hours(input_restaurant_id uuid)
returns table(hour int, order_count bigint)
language sql
stable
as $$
  select extract(hour from created_at)::int as hour, count(*)::bigint as order_count
  from orders
  where restaurant_id = input_restaurant_id
    and status = 'COMPLETED'
  group by extract(hour from created_at)
  order by order_count desc;
$$;

alter table feature_bundles enable row level security;
alter table restaurants enable row level security;
alter table feature_flags enable row level security;
alter table staff enable row level security;
alter table tables enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table inventory_categories enable row level security;
alter table inventory_items enable row level security;
alter table menu_item_ingredients enable row level security;
alter table inventory_alerts enable row level security;
alter table inventory_wastage enable row level security;
alter table customers enable row level security;
alter table loyalty_transactions enable row level security;
alter table preorders enable row level security;
alter table preorder_items enable row level security;
alter table audit_logs enable row level security;
alter table deployments enable row level security;

create policy bundles_read on feature_bundles
for select
using (auth.uid() is not null);

create policy bundles_manage_superadmin on feature_bundles
for all
using (is_super_admin())
with check (is_super_admin());

create policy restaurants_access on restaurants
for select
using (is_super_admin() or id = current_restaurant_id());

create policy restaurants_update on restaurants
for update
using (is_super_admin() or id = current_restaurant_id())
with check (is_super_admin() or id = current_restaurant_id());

create policy restaurants_insert_superadmin on restaurants
for insert
with check (is_super_admin());

create policy restaurants_delete_superadmin on restaurants
for delete
using (is_super_admin());

create or replace function create_tenant_policy(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('create policy %I_select on %I for select using (is_super_admin() or restaurant_id = current_restaurant_id())', table_name, table_name);
  execute format('create policy %I_insert on %I for insert with check (is_super_admin() or restaurant_id = current_restaurant_id())', table_name, table_name);
  execute format('create policy %I_update on %I for update using (is_super_admin() or restaurant_id = current_restaurant_id()) with check (is_super_admin() or restaurant_id = current_restaurant_id())', table_name, table_name);
  execute format('create policy %I_delete on %I for delete using (is_super_admin() or restaurant_id = current_restaurant_id())', table_name, table_name);
end;
$$;

select create_tenant_policy('feature_flags');
select create_tenant_policy('staff');
select create_tenant_policy('tables');
select create_tenant_policy('menu_categories');
select create_tenant_policy('menu_items');
select create_tenant_policy('orders');
select create_tenant_policy('order_items');
select create_tenant_policy('payments');
select create_tenant_policy('inventory_categories');
select create_tenant_policy('inventory_items');
select create_tenant_policy('menu_item_ingredients');
select create_tenant_policy('inventory_alerts');
select create_tenant_policy('inventory_wastage');
select create_tenant_policy('customers');
select create_tenant_policy('loyalty_transactions');
select create_tenant_policy('preorders');
select create_tenant_policy('preorder_items');
select create_tenant_policy('audit_logs');
select create_tenant_policy('deployments');

drop function create_tenant_policy(text);
