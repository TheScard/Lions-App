-- Fahrgemeinschaften: atomare Sitzplatz-Buchung.
--
-- Problem: "Anzahl bestehender Buchungen zaehlen, dann pruefen ob noch
-- Platz frei ist, dann Buchung einfuegen" ist KEIN atomarer Vorgang, wenn
-- Zaehlen und Einfuegen zwei getrennte PostgREST-Requests sind. Zwei
-- Mitglieder koennten gleichzeitig zaehlen ("4 von 5 belegt"), beide
-- den letzten Platz als frei ansehen und beide erfolgreich buchen ->
-- total_seats waere ueberschritten.
--
-- Loesung: Diese Funktion fuehrt Zaehlung + Einfuegen in EINER Transaktion
-- aus und sperrt vorher die betroffene carpools-Zeile mit
-- `select ... for update`. Ruft ein zweites Mitglied die Funktion fuer
-- dieselbe Fahrt waehrenddessen auf, blockiert dessen Transaktion an
-- genau dieser Stelle, bis die erste committed oder zurückgerollt wurde.
-- Dadurch sehen beide Aufrufe garantiert konsistente Buchungszahlen und
-- total_seats kann nicht ueberschritten werden.
--
-- Der bestehende unique(carpool_id, member_id)-Constraint auf
-- carpool_bookings bleibt zusaetzlich als zweite Absicherung gegen
-- Doppel-Buchungen desselben Mitglieds bestehen (z.B. Doppelklick).

create or replace function book_carpool_seat(p_carpool_id uuid)
returns carpool_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid := auth.uid();
  v_total_seats int;
  v_booked_count int;
  v_booking carpool_bookings;
begin
  if v_member_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Sperrt die Zeile fuer die Dauer der Transaktion (siehe Kommentar oben).
  select total_seats into v_total_seats
  from carpools
  where id = p_carpool_id
  for update;

  if not found then
    raise exception 'carpool_not_found' using errcode = 'P0002';
  end if;

  select count(*) into v_booked_count
  from carpool_bookings
  where carpool_id = p_carpool_id;

  if v_booked_count >= v_total_seats then
    raise exception 'carpool_full' using errcode = 'P0001';
  end if;

  insert into carpool_bookings (carpool_id, member_id)
  values (p_carpool_id, v_member_id)
  returning * into v_booking;

  return v_booking;
end;
$$;

comment on function book_carpool_seat is
  'Bucht atomar einen Sitzplatz fuer das eingeloggte Mitglied (auth.uid()). Sperrt die carpools-Zeile per SELECT ... FOR UPDATE, damit Zaehlung und Einfuegen nicht racen koennen. Wirft carpool_full, wenn kein Platz mehr frei ist.';

-- Nur eingeloggte Mitglieder duerfen buchen; anon hat ohnehin kein auth.uid().
grant execute on function book_carpool_seat(uuid) to authenticated;
