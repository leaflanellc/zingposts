alter table public.saved_items
  add column if not exists tags_json text not null default '[]';
