-- À coller en entier dans Supabase → SQL Editor → Run. Une seule fois.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  pseudo text default 'Anonyme',
  xp int default 0,
  streak int default 0,
  last date
);

create table cats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default '#ff6b4a',
  created_at timestamptz default now()
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  lang text not null check (lang in ('en','es')),
  title text not null,
  cat uuid references cats on delete set null,
  words jsonb not null default '[]',
  public boolean not null default false,
  rev int not null default 1,
  pseudo text,
  origin_id uuid,   -- leçon publique d'où vient la copie (pas de clé étrangère : la copie survit si l'original disparaît)
  origin_rev int,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table cats enable row level security;
alter table lessons enable row level security;

create policy "profil perso" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "categories perso" on cats for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- les invités (non connectés) lisent les leçons publiques, personne d'autre ne voit les privées
create policy "lecons lisibles" on lessons for select using (public or owner = auth.uid());
create policy "lecons creation" on lessons for insert with check (owner = auth.uid());
create policy "lecons modif" on lessons for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "lecons suppression" on lessons for delete using (owner = auth.uid());

-- la version d'une leçon publique monte quand son titre ou ses mots changent
create function monter_version() returns trigger language plpgsql as $$
begin
  if new.public and (new.words is distinct from old.words or new.title is distinct from old.title) then
    new.rev := old.rev + 1;
  end if;
  return new;
end $$;
create trigger lecon_version before update on lessons for each row execute function monter_version();

-- à l'inscription : un profil + une catégorie de départ
create function nouveau_profil() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, pseudo) values (new.id, coalesce(new.raw_user_meta_data->>'pseudo', 'Anonyme'));
  insert into cats (user_id, name) values (new.id, 'Vocabulaire');
  return new;
end $$;
create trigger apres_inscription after insert on auth.users for each row execute function nouveau_profil();
