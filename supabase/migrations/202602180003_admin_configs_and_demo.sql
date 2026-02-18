create table if not exists tax_configurations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references restaurants(id) on delete cascade,
  tax_name text not null default 'Sales Tax',
  tax_percentage numeric(5,2) not null default 8.00,
  service_charge_percentage numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branding_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references restaurants(id) on delete cascade,
  brand_name text,
  logo_url text,
  primary_color text not null default '#0f766e',
  secondary_color text not null default '#ea580c',
  invoice_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tax_configurations_updated before update on tax_configurations for each row execute function set_updated_at();
create trigger trg_branding_settings_updated before update on branding_settings for each row execute function set_updated_at();

alter table tax_configurations enable row level security;
alter table branding_settings enable row level security;

create policy tax_configurations_select on tax_configurations
for select
using (is_super_admin() or restaurant_id = current_restaurant_id());

create policy tax_configurations_insert on tax_configurations
for insert
with check (is_super_admin() or restaurant_id = current_restaurant_id());

create policy tax_configurations_update on tax_configurations
for update
using (is_super_admin() or restaurant_id = current_restaurant_id())
with check (is_super_admin() or restaurant_id = current_restaurant_id());

create policy tax_configurations_delete on tax_configurations
for delete
using (is_super_admin() or restaurant_id = current_restaurant_id());

create policy branding_settings_select on branding_settings
for select
using (is_super_admin() or restaurant_id = current_restaurant_id());

create policy branding_settings_insert on branding_settings
for insert
with check (is_super_admin() or restaurant_id = current_restaurant_id());

create policy branding_settings_update on branding_settings
for update
using (is_super_admin() or restaurant_id = current_restaurant_id())
with check (is_super_admin() or restaurant_id = current_restaurant_id());

create policy branding_settings_delete on branding_settings
for delete
using (is_super_admin() or restaurant_id = current_restaurant_id());
