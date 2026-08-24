-- Verhindert, dass der letzte verbleibende admin degradiert oder geloescht
-- wird. Greift als zweite Absicherung auf DB-Ebene, unabhaengig vom
-- Aufrufer (Server Action in app/admin/members/actions.ts, SQL-Editor,
-- etc.) -- die Server Actions pruefen dieselbe Regel zusaetzlich vorab,
-- um eine klare Fehlermeldung im UI zeigen zu koennen, statt den rohen
-- Trigger-Fehler durchzureichen.
--
-- Bekannte Einschraenkung: die COUNT-Abfrage im Trigger nimmt keine
-- explizite Zeilensperre (kein FOR UPDATE), um Deadlocks zwischen zwei
-- Transaktionen zu vermeiden, die gleichzeitig unterschiedliche
-- Admin-Zeilen aendern. Bei zwei admins, die im exakt selben Moment beide
-- degradiert/geloescht werden, ist ein sehr enges Race-Fenster theoretisch
-- moeglich. Fuer den realistischen Fall (ein Admin handelt) ist die Regel
-- vollstaendig durchgesetzt.

create or replace function prevent_last_admin_removal()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'DELETE' and OLD.role = 'admin')
     or (TG_OP = 'UPDATE' and OLD.role = 'admin' and NEW.role <> 'admin') then
    if (select count(*) from members where role = 'admin' and id <> OLD.id) = 0 then
      raise exception 'Der letzte verbleibende Admin kann nicht degradiert oder geloescht werden.'
        using errcode = 'P0001';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_prevent_last_admin_removal on members;
create trigger trg_prevent_last_admin_removal
  before update or delete on members
  for each row
  execute function prevent_last_admin_removal();
