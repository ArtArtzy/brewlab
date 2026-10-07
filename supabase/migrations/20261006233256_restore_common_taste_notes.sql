-- Restore common suggestions and repair old default tags assigned to Other.
-- Existing custom tags and bean selections are preserved.
with defaults(name, category) as (values
  ('Berry', 'Fruity'), ('Strawberry', 'Fruity'), ('Blueberry', 'Fruity'),
  ('Raspberry', 'Fruity'), ('Blackberry', 'Fruity'), ('Cherry', 'Fruity'),
  ('Peach', 'Fruity'), ('Apple', 'Fruity'), ('Grape', 'Fruity'),
  ('Orange', 'Fruity'), ('Lemon', 'Fruity'), ('Lychee', 'Fruity'), ('Tropical', 'Fruity'),
  ('Rose', 'Floral'), ('Jasmine', 'Floral'), ('Hibiscus', 'Floral'), ('Chamomile', 'Floral'), ('Tea-like', 'Floral'),
  ('Honey', 'Sweet'), ('Caramel', 'Sweet'), ('Brown Sugar', 'Sweet'),
  ('Vanilla', 'Sweet'), ('Candy', 'Sweet'), ('Maple Syrup', 'Sweet'),
  ('Chocolate', 'Chocolate / Nutty'), ('Cocoa', 'Chocolate / Nutty'),
  ('Dark Chocolate', 'Chocolate / Nutty'), ('Milk Chocolate', 'Chocolate / Nutty'),
  ('Almond', 'Chocolate / Nutty'), ('Hazelnut', 'Chocolate / Nutty'),
  ('Walnut', 'Chocolate / Nutty'), ('Peanut', 'Chocolate / Nutty'),
  ('Fermented', 'Other'), ('Winey', 'Other'), ('Whiskey Like', 'Other'),
  ('Spice', 'Other'), ('Cinnamon', 'Other'), ('Tiramisu', 'Other'), ('Black Tea', 'Other')
), corrected as (
  update public.choices c set category = d.category
  from defaults d
  where c.kind = 'note' and lower(c.name) = lower(d.name)
    and c.category = 'Other' and d.category <> 'Other'
  returning c.id
)
insert into public.choices(kind, name, category)
select 'note', d.name, d.category from defaults d
where not exists (
  select 1 from public.choices c where c.kind = 'note' and lower(c.name) = lower(d.name)
)
on conflict (kind, name) do nothing;
