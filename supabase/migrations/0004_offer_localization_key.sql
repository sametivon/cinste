-- Optional for all offers, required only for controlled CINSTE catalog fixtures.
-- Partner-authored offers remain untranslated until a deliberate localization key is assigned.
alter table public.offers add column if not exists localization_key text;
create unique index if not exists offers_localization_key_unique on public.offers(localization_key) where localization_key is not null;

update public.offers o
set localization_key = case
  when p.slug = 'cafeneaua-verde' and c.slug = 'food-drink' and o.name = 'Cappuccino' then 'cappuccino'
  when p.slug = 'cinema-luna' and c.slug = 'cinema' and o.name = 'Movie Ticket' then 'movie_ticket'
  when p.slug = 'barber-club' and c.slug = 'hair-grooming' and o.name = 'Student Haircut' then 'student_haircut'
end
from public.partners p, public.categories c
where o.partner_id = p.id and o.category_id = c.id and o.localization_key is null
  and ((p.slug = 'cafeneaua-verde' and c.slug = 'food-drink' and o.name = 'Cappuccino')
    or (p.slug = 'cinema-luna' and c.slug = 'cinema' and o.name = 'Movie Ticket')
    or (p.slug = 'barber-club' and c.slug = 'hair-grooming' and o.name = 'Student Haircut'));
