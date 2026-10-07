-- Persist the previously hardcoded suggestions so every tag can be managed.
insert into public.choices(kind, name, category)
select 'note', name, category from (values
  ('Berry', 'Fruity'), ('Cherry', 'Fruity'), ('Peach', 'Fruity'),
  ('Orange', 'Fruity'), ('Lemon', 'Fruity'), ('Apple', 'Fruity'),
  ('Grape', 'Fruity'), ('Tropical', 'Fruity'),
  ('Rose', 'Floral'), ('Jasmine', 'Floral'), ('Hibiscus', 'Floral'), ('Tea-like', 'Floral'),
  ('Honey', 'Sweet'), ('Caramel', 'Sweet'), ('Brown Sugar', 'Sweet'), ('Candy', 'Sweet'), ('Vanilla', 'Sweet'),
  ('Chocolate', 'Chocolate / Nutty'), ('Cocoa', 'Chocolate / Nutty'),
  ('Almond', 'Chocolate / Nutty'), ('Hazelnut', 'Chocolate / Nutty'),
  ('Tiramisu', 'Other'), ('Whiskey Like', 'Other'), ('Winey', 'Other'),
  ('Fermented', 'Other'), ('Spice', 'Other')
) as defaults(name, category)
on conflict (kind, name) do nothing;

-- Keep the tag, bean arrays and relational links consistent in one transaction.
create function public.manage_taste_note(
  p_id uuid, p_name text, p_category text, p_delete boolean default false
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  old_name text;
begin
  if p_delete is null then raise exception 'Choose a taste note action.'; end if;
  if not p_delete then
    p_name := btrim(p_name);
    if p_name is null or length(p_name) < 1 or length(p_name) > 80 then
      raise exception 'Enter a taste note name between 1 and 80 characters.';
    end if;
    if p_category is null or p_category not in ('Fruity', 'Floral', 'Sweet', 'Chocolate / Nutty', 'Other') then
      raise exception 'Choose a taste category.';
    end if;
  end if;

  -- Serialize bean edits while their note arrays and links are being changed.
  lock table public.beans in share row exclusive mode;
  select name into old_name from public.choices where id = p_id and kind = 'note' for update;
  if not found then raise exception 'Taste note not found.'; end if;

  if p_delete then
    update public.beans set notes = array_remove(notes, old_name)
      where notes @> array[old_name];
    delete from public.bean_taste_notes where note_id = p_id;
    delete from public.choices where id = p_id;
  else
    if exists (select 1 from public.choices where kind = 'note' and name = p_name and id <> p_id) then
      raise exception 'A taste note with this name already exists.';
    end if;
    update public.choices set name = p_name, category = p_category where id = p_id;
    if old_name <> p_name then
      update public.beans set notes = array(
        select n from unnest(array_replace(notes, old_name, p_name)) with ordinality as tags(n, ord)
        group by n order by min(ord)
      ) where notes @> array[old_name];
    end if;
  end if;
end;
$$;
revoke execute on function public.manage_taste_note(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.manage_taste_note(uuid, text, text, boolean) to service_role;
