# Web Push einrichten

Eigenes Web Push mit VAPID, ohne Drittanbieter (kein Firebase o.ä.).

## 1. VAPID-Schlüssel erzeugen

```
npx web-push generate-vapid-keys
```

Liefert einen `Public Key` und einen `Private Key`. Beide einmalig erzeugen
und dauerhaft verwenden -- werden sie geändert, müssen sich alle Geräte neu
registrieren (bestehende Subscriptions werden ungültig).

## 2. Env-Variablen

### Lokal (`.env.local`)

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Public Key>
VAPID_PRIVATE_KEY=<Private Key>
VAPID_SUBJECT=mailto:info@lions-adenau.de
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=<langer zufälliger Wert, z.B. per `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`>
```

### Vercel (Production)

Dieselben fünf Variablen unter **Project Settings → Environment Variables**
für die **Production**-Umgebung anlegen:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `NEXT_PUBLIC_APP_URL` (die echte Domain, z.B. `https://lions-adenau.vercel.app`, ohne abschließenden Slash)
- `CRON_SECRET`

Nach dem Setzen/Ändern ein neues Deployment anstoßen, damit die Werte
greifen.

## 3. Vercel Cron läuft nur auf Production

Der in `vercel.json` definierte Cron-Job (`/api/cron/reminders`, alle 15
Minuten) wird von Vercel **ausschließlich auf dem Production-Deployment**
ausgeführt, nicht auf Preview-Deployments. Zum Testen auf einem
Preview-Deployment muss der Endpoint daher manuell aufgerufen werden (siehe
unten).

## 4. Cron-Endpoint manuell testen

PowerShell:

```powershell
Invoke-RestMethod -Uri "https://<deine-domain>/api/cron/reminders" -Headers @{ Authorization = "Bearer <CRON_SECRET>" }
```

Lokal gegen den Dev-Server:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/cron/reminders" -Headers @{ Authorization = "Bearer <CRON_SECRET>" }
```

Die Antwort ist ein JSON mit der Anzahl gesendeter Erinnerungen, z.B.
`{ "trainingReminders": 1, "matchReminders": 0 }`. Ein erneuter Aufruf
innerhalb desselben Zeitfensters sendet keine doppelten Erinnerungen
(Idempotenz über `notification_log`).
