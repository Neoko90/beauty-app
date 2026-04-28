# REFERLY — Kompletna instrukcja wdrożenia na Vercel

---

## SPIS TREŚCI

1. Co jest w tym archiwum
2. Krok 1 — Rejestracja kont (Supabase, Vercel, GitHub)
3. Krok 2 — Konfiguracja Supabase (baza danych)
4. Krok 3 — Konfiguracja Storage (zdjęcia)
5. Krok 4 — Wgranie kodu na GitHub
6. Krok 5 — Wdrożenie na Vercel
7. Krok 6 — Konfiguracja Auth (logowanie)
8. Krok 7 — Pierwsze uruchomienie i założenie salonu
9. Krok 8 — Dostęp do panelu Superadmin
10. Krok 9 — Konfiguracja SMS (SMSPlanet)
11. Krok 10 — Własna domena
12. Rozwiązywanie problemów

---

## 1. CO JEST W TYM ARCHIWUM

Po rozpakowaniu zobaczysz:

```
referly/
├── src/                    ← cały kod aplikacji
│   ├── app/                ← strony Next.js
│   ├── components/         ← komponenty React
│   ├── lib/                ← Supabase, utilities
│   └── types/              ← typy TypeScript
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  ← ← ← WKLEJ TO DO SUPABASE
├── package.json
├── tailwind.config.ts
├── next.config.ts
├── .env.local.example      ← ← ← SKOPIUJ I UZUPEŁNIJ
└── INSTRUKCJA_WDROZENIA.md ← ten plik
```

**WAŻNE:** Folder `node_modules` NIE jest w archiwum — zostanie pobrany
automatycznie poleceniem `npm install`.

---

## 2. KROK 1 — REJESTRACJA KONT

Potrzebujesz trzech darmowych kont. Zarejestruj je przed rozpoczęciem.

### 2.1 GitHub (bezpłatny)
→ https://github.com/signup

Podaj email, hasło, nazwę użytkownika. Potwierdź email.

### 2.2 Supabase (bezpłatny, potem 25 USD/mies. dla produkcji)
→ https://supabase.com

Kliknij "Start your project" → zarejestruj się przez GitHub lub email.

### 2.3 Vercel (bezpłatny, potem 20 USD/mies. dla produkcji)
→ https://vercel.com

Kliknij "Sign Up" → zaloguj się przez GitHub (najwygodniej).

---

## 3. KROK 2 — KONFIGURACJA SUPABASE

### 3.1 Utwórz nowy projekt

1. Zaloguj się na https://supabase.com
2. Kliknij **"New project"**
3. Wypełnij:
   - **Name:** `referly` (lub dowolna nazwa)
   - **Database Password:** wymyśl mocne hasło, ZAPISZ JE gdzieś
   - **Region:** `Central EU (Frankfurt)` — najszybszy dla Polski
4. Kliknij **"Create new project"**
5. Poczekaj 1-2 minuty aż projekt się uruchomi

### 3.2 Uruchom schemat bazy danych

1. W lewym menu kliknij ikonę bazy danych (lub **"SQL Editor"**)
2. Kliknij **"New query"** (przycisk w górnym lewym rogu edytora)
3. Otwórz plik `supabase/migrations/001_initial_schema.sql` z archiwum
4. Zaznacz całą zawartość (Ctrl+A) i skopiuj (Ctrl+C)
5. Wklej do edytora Supabase (Ctrl+V)
6. Kliknij zielony przycisk **"Run"** (lub Ctrl+Enter)
7. Poczekaj kilka sekund
8. Powinnaś zobaczyć: **"Success. No rows returned"**

> ❌ Jeśli zobaczysz błąd "already exists" — to znaczy że SQL był już
> uruchomiony wcześniej. Możesz go zignorować, tabele już istnieją.
>
> ❌ Jeśli zobaczysz inny błąd — skopiuj treść błędu i napisz do nas.

### 3.3 Pobierz klucze API

1. W lewym menu kliknij ikonę koła zębatego **"Settings"**
2. Kliknij **"API"**
3. Skopiuj i zapisz w bezpiecznym miejscu:

```
Project URL:    https://XXXXXXXXXXXXXXXX.supabase.co
anon key:       eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Te dwa klucze będą potrzebne w Kroku 5 przy konfiguracji Vercel.
> NIE udostępniaj ich publicznie ani nie wrzucaj na GitHub.

---

## 4. KROK 3 — KONFIGURACJA STORAGE (zdjęcia pracowników, logo salonu)

Bez tego kroku upload zdjęć NIE będzie działał.

1. W Supabase kliknij **"SQL Editor"** → **"New query"**
2. Wklej poniższy kod i kliknij **"Run"**:

```sql
-- Tworzenie bucketów na zdjęcia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',     'avatars',     true, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('salon-media', 'salon-media', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Polityki dostępu — publiczny odczyt
CREATE POLICY IF NOT EXISTS "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "salon_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'salon-media');

-- Zalogowani mogą uploadować
CREATE POLICY IF NOT EXISTS "avatars_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "salon_media_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'salon-media' AND auth.role() = 'authenticated');

-- Zalogowani mogą aktualizować i usuwać swoje pliki
CREATE POLICY IF NOT EXISTS "avatars_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "avatars_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "salon_media_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'salon-media' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "salon_media_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'salon-media' AND auth.role() = 'authenticated');
```

3. Sprawdź czy buckety są widoczne: kliknij **"Storage"** w lewym menu,
   powinnaś widzieć `avatars` i `salon-media`.

---

## 5. KROK 4 — WGRANIE KODU NA GITHUB

### 5.1 Zainstaluj Git (jeśli nie masz)

**Windows:** https://git-scm.com/download/win → pobierz i zainstaluj

**Mac:** w terminalu wpisz `git --version` — zainstaluje się automatycznie

### 5.2 Utwórz nowe repozytorium na GitHub

1. Zaloguj się na https://github.com
2. Kliknij **"+"** (prawy górny róg) → **"New repository"**
3. Wypełnij:
   - **Repository name:** `referly`
   - **Visibility:** Private (zalecane) lub Public
4. **NIE zaznaczaj** "Add a README file"
5. Kliknij **"Create repository"**
6. GitHub pokaże stronę z pustym repo — skopiuj adres HTTPS, np.:
   `https://github.com/TWOJA_NAZWA/referly.git`

### 5.3 Przygotuj projekt lokalnie

Otwórz terminal (Windows: PowerShell lub Git Bash, Mac: Terminal):

```bash
# Przejdź do wypakowanego folderu
cd ścieżka/do/referly

# Zainstaluj zależności
npm install --legacy-peer-deps

# Zainicjuj Git
git init

# Dodaj wszystkie pliki
git add .

# Pierwszy commit
git commit -m "Referly v1.0"

# Połącz z GitHub (wklej swój adres z kroku 5.2)
git remote add origin https://github.com/TWOJA_NAZWA/referly.git

# Wypchnij kod
git push -u origin main
```

> Jeśli pojawi się pytanie o login GitHub — podaj swoje dane.
> Jeśli pojawi się błąd "master vs main" — spróbuj:
> `git push -u origin master` albo najpierw `git branch -M main`

---

## 6. KROK 5 — WDROŻENIE NA VERCEL

### 6.1 Zaimportuj projekt

1. Zaloguj się na https://vercel.com
2. Kliknij **"Add New Project"** lub **"New Project"**
3. Kliknij **"Import"** przy swoim repozytorium `referly`
   - Jeśli nie widzisz repo — kliknij "Adjust GitHub App Permissions" i daj dostęp
4. Framework preset: **Next.js** (wykryje automatycznie)
5. Root directory: zostaw puste (`.`)

### 6.2 Dodaj zmienne środowiskowe

**ZANIM klikniesz Deploy** — rozwiń sekcję **"Environment Variables"** i dodaj:

| Nazwa | Wartość | Opis |
|-------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://XXXXX.supabase.co` | Z kroku 3.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (długi ciąg) | Z kroku 3.3 |
| `NEXT_PUBLIC_APP_URL` | `https://referly.vercel.app` | Twój docelowy adres |

> `NEXT_PUBLIC_APP_URL` wpisz tymczasowo `https://referly.vercel.app`
> (lub z Twoją nazwą). Możesz to zmienić po deploymencie gdy poznasz
> dokładny adres.

**Jak dodać zmienną:**
- Kliknij pole "Key" → wpisz nazwę zmiennej
- Kliknij pole "Value" → wklej wartość
- Kliknij przycisk "Add" po prawej
- Powtórz dla każdej zmiennej

### 6.3 Uruchom deployment

1. Kliknij **"Deploy"**
2. Poczekaj 2-4 minuty — Vercel buduje projekt
3. Gdy zobaczysz zielone "✓ Congratulations!" — gotowe!
4. Kliknij na podgląd lub skopiuj adres, np. `referly-abc123.vercel.app`

### 6.4 Zaktualizuj NEXT_PUBLIC_APP_URL

Po deploymencie znasz już dokładny adres Vercel:

1. W Vercel wejdź w projekt → **"Settings"** → **"Environment Variables"**
2. Znajdź `NEXT_PUBLIC_APP_URL` → kliknij ołówek (edytuj)
3. Wpisz dokładny adres np. `https://referly-abc123.vercel.app`
4. Kliknij **"Save"**
5. Wróć do zakładki **"Deployments"** → kliknij **"Redeploy"** (trzy kropki przy ostatnim deployu)

---

## 7. KROK 6 — KONFIGURACJA AUTH (LOGOWANIE)

Bez tego logowanie może nie działać poprawnie.

### 7.1 Ustaw URL w Supabase

1. Wejdź w swój projekt Supabase
2. Kliknij **"Authentication"** w lewym menu
3. Kliknij **"URL Configuration"**
4. Wypełnij:

```
Site URL:
https://TWOJ_ADRES.vercel.app

Redirect URLs (dodaj oba):
https://TWOJ_ADRES.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

5. Kliknij **"Save"**

### 7.2 Opcjonalnie — wyłącz potwierdzenie email (dla testów)

> Przydatne żeby od razu się zalogować bez czekania na email

1. Supabase → **Authentication** → **"Providers"**
2. Kliknij **"Email"**
3. Odznacz **"Enable email confirmations"**
4. Kliknij **"Save"**

> ⚠️ Przed startem produkcyjnym włącz to ponownie dla bezpieczeństwa

---

## 8. KROK 7 — PIERWSZE URUCHOMIENIE I ZAŁOŻENIE SALONU

1. Otwórz w przeglądarce adres swojej aplikacji Vercel
2. Kliknij **"Zarejestruj salon"** (lub przejdź na `/auth/register`)
3. Wpisz swój email i hasło (min. 8 znaków)
4. Kliknij **"Utwórz konto →"**

Jeśli masz wyłączone potwierdzenie email:
→ Zostaniesz od razu przekierowana do Onboardingu (kreatora salonu)

Jeśli masz włączone potwierdzenie email:
→ Sprawdź skrzynkę pocztową, kliknij link aktywacyjny
→ Wróć na stronę i zaloguj się

### 7.1 Kreator onboardingu (5 kroków)

**Krok 1 — Twój salon**
- Nazwa salonu (np. "Salon Urody Kasi")
- Telefon, miasto, adres
- Opis salonu

**Krok 2 — Zasoby**
- Fotele, gabinety
- Np. "Fotel 1", "Fotel 2", "Gabinet manicure"
- Możesz pominąć i dodać potem

**Krok 3 — Usługi**
- Usługi z ceną i czasem trwania
- Np. Strzyżenie → 80 zł → 60 min
- Możesz pominąć i dodać potem

**Krok 4 — Pracownik**
- Imię i nazwisko pierwszego pracownika (możesz wpisać siebie)
- Wybierz kolor w kalendarzu

**Krok 5 — Gotowe!**
- Kliknij "Otwórz pulpit →"

### 7.2 Co zobaczysz na pulpicie

- **Kalendarz** — dodawaj wizyty, klikaj w sloty
- **Klienci** — baza klientek, historia wizyt
- **Polecenia** — program poleceń z kodami
- **Ustawienia** — dane salonu, pracownicy, usługi, zdjęcia

---

## 9. KROK 8 — PANEL SUPERADMIN

Panel superadmina (`/superadmin/dashboard`) daje wgląd w WSZYSTKIE salony
na platformie. Potrzebujesz go tylko jeśli prowadzisz Referly jako SaaS
dla wielu salonów.

### 9.1 Nadaj sobie uprawnienia superadmina

1. Zaloguj się w swojej aplikacji i załóż konto (krok 7)
2. Przejdź do Supabase → **"SQL Editor"** → **"New query"**
3. Wklej poniższe SQL, **zamieniając email na swój**:

```sql
UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb)
  || '{"is_superadmin": true}'::jsonb
WHERE email = 'TWOJ@EMAIL.PL';
```

4. Kliknij **"Run"**
5. Powinnaś zobaczyć: **"Success. 1 rows affected"**

### 9.2 Dostęp do panelu

1. Wyloguj się z aplikacji i zaloguj ponownie (ważne — odświeża token)
2. Przejdź na adres: `https://TWOJ_ADRES.vercel.app/superadmin/dashboard`
3. Zobaczysz statystyki platformy, listę salonów i ich plany

> Jeśli zobaczysz błąd 403 lub przekierowanie na pulpit —
> upewnij się że wylogowałaś się i zalogowałaś ponownie po nadaniu uprawnień.

---

## 10. KROK 9 — KONFIGURACJA SMS (SMSPlanet)

Aplikacja wysyła SMS-y przez platformę SMSPlanet.pl. Każdy właściciel
salonu konfiguruje swój własny klucz API w ustawieniach.

### 10.1 Zarejestruj konto w SMSPlanet

1. Wejdź na https://smsplanet.pl
2. Kliknij **"Rejestracja"**
3. Wypełnij dane firmy lub jako osoba prywatna
4. Potwierdź email
5. Doładuj konto — minimalna wpłata to zazwyczaj 20-50 zł
   (cena za SMS to ok. 0.09-0.15 zł netto)

### 10.2 Pobierz klucz API

1. Zaloguj się w panelu SMSPlanet
2. Wejdź w **"Integracje"** lub **"API"** (może być w Ustawieniach)
3. Wygeneruj **klucz API** (Token API)
4. Skopiuj go — będzie potrzebny w następnym kroku

### 10.3 Wprowadź klucz w aplikacji

1. Zaloguj się do swojego panelu salonu
2. Przejdź do **"Automatyzacje"** w lewym menu
3. W sekcji "Stan SMS" znajdziesz:
   - Pole **"Klucz API SMSPlanet"** — wklej skopiowany klucz
   - Pole **"Nadawca SMS"** — wpisz nazwę (max 11 znaków, np. "Mój Salon")
4. Kliknij **"Zapisz konfigurację"**

### 10.4 Sprawdź szablony SMS

W tej samej zakładce "Automatyzacje" masz gotowe szablony:
- **Przypomnienie** — wysyłane 24h przed wizytą
- **Potwierdzenie** — po dodaniu wizyty

Możesz je edytować. Dostępne zmienne w treści:
- `{imie}` — imię klientki
- `{data}` — data wizyty (DD.MM.YYYY)
- `{godzina}` — godzina wizyty (HH:MM)
- `{usluga}` — nazwa usługi
- `{link}` — magic link do zarządzania wizytą

**Przykładowy szablon:**
```
Cześć {imie}! Jutro o {godzina} masz wizytę na {usluga}.
Zmień lub odwołaj: {link}
Pozdrawiamy, Salon XYZ
```

> SMS musi mieć max 160 znaków (1 SMS). Dłuższe wiadomości kosztują
> 2x lub 3x więcej. Licznik znaków jest widoczny pod polem tekstowym.

### 10.5 Salony na Twoim platformie

Jeśli prowadzisz Referly dla wielu salonów — KAŻDY salon konfiguruje
swój własny klucz SMSPlanet. Ty jako superadmin nie musisz nic konfigurować.

---

## 11. KROK 10 — WŁASNA DOMENA

Jeśli chcesz żeby aplikacja była pod adresem np. `app.referly.pl`
zamiast `referly-abc.vercel.app`.

### 11.1 Kup domenę

Przykładowi dostawcy:
- Domeny.pl (polskie, PLN) — https://domeny.pl
- OVH — https://ovh.pl
- Namecheap — https://namecheap.com (USD)

Kup domenę np. `referly.pl`, `mojsalon.pl` lub `app.mojsalon.pl`

### 11.2 Dodaj domenę w Vercel

1. W Vercel wejdź w projekt → **"Settings"** → **"Domains"**
2. Wpisz swoją domenę np. `app.referly.pl`
3. Kliknij **"Add"**
4. Vercel pokaże Ci instrukcję — skopiuj wartości DNS

### 11.3 Skonfiguruj DNS

1. Zaloguj się u swojego dostawcy domeny
2. Wejdź w zarządzanie DNS / strefą DNS
3. Dodaj rekord wskazany przez Vercel, zwykle:
   ```
   Typ:    CNAME
   Nazwa:  app  (lub @ dla domeny głównej)
   Wartość: cname.vercel-dns.com
   ```
4. Poczekaj 5-30 minut na propagację DNS

### 11.4 Zaktualizuj adresy

Po ustawieniu domeny zaktualizuj:

**W Vercel** — Settings → Environment Variables:
```
NEXT_PUBLIC_APP_URL = https://app.referly.pl
```

**W Supabase** — Authentication → URL Configuration:
```
Site URL: https://app.referly.pl
Redirect URLs: https://app.referly.pl/auth/callback
```

Następnie zrób **Redeploy** w Vercel (zakładka Deployments → trzy kropki → Redeploy).

---

## 12. ROZWIĄZYWANIE PROBLEMÓW

### ❌ Strona się nie ładuje / biała ekran
**Przyczyna:** Brak lub błędne zmienne środowiskowe w Vercel
**Rozwiązanie:**
1. Vercel → projekt → Settings → Environment Variables
2. Sprawdź czy `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY` są ustawione
3. Upewnij się że nie ma spacji przed/po wartości
4. Zrób Redeploy

### ❌ "relation does not exist" / błąd SQL
**Przyczyna:** Schemat bazy nie został uruchomiony lub się nie zapisał
**Rozwiązanie:**
1. Supabase → SQL Editor → New query
2. Wklej całą zawartość pliku `001_initial_schema.sql` i uruchom ponownie
3. Pomiń błędy "already exists"

### ❌ Nie mogę się zarejestrować / błąd przy rejestracji
**Przyczyna 1:** Nie skonfigurowałaś URL w Supabase Auth
→ Wykonaj Krok 6 (URL Configuration)

**Przyczyna 2:** Email nie dotarł
→ Supabase → Authentication → Providers → Email → wyłącz "Enable email confirmations"

### ❌ Przekierowanie w kółko (redirect loop)
**Przyczyna:** Przeglądarka ma stare ciasteczka
**Rozwiązanie:** Wyczyść ciasteczka / otwórz w trybie incognito / użyj innej przeglądarki

### ❌ Upload zdjęcia nie działa / "Bucket not found"
**Przyczyna:** Nie wykonałaś Kroku 3 (Storage)
**Rozwiązanie:** Uruchom SQL z Kroku 3 w Supabase SQL Editor

### ❌ SMS-y nie wysyłają się
**Przyczyna 1:** Nie wpisałaś klucza API w Automatyzacjach
→ Panel → Automatyzacje → wpisz klucz API SMSPlanet

**Przyczyna 2:** Brak środków na koncie SMSPlanet
→ Zaloguj się na smsplanet.pl i doładuj konto

**Przyczyna 3:** Błędny klucz API
→ Wygeneruj nowy klucz w panelu SMSPlanet

### ❌ Superadmin nie ma dostępu do /superadmin
**Przyczyna:** Nie wylogowałaś się po nadaniu uprawnień
**Rozwiązanie:** Wyloguj się → zaloguj ponownie → spróbuj ponownie

### ❌ Deployment na Vercel się nie udał
**Rozwiązanie:**
1. Vercel → projekt → zakładka "Deployments"
2. Kliknij na nieudany deployment
3. Przewiń do sekcji "Build Logs"
4. Skopiuj ostatnie 20 linii błędu i sprawdź co się dzieje

---

## ADRESY W APLIKACJI

| Adres | Co to jest |
|-------|-----------|
| `/` | Strona główna Referly (landing) |
| `/auth/register` | Rejestracja nowego salonu |
| `/auth/login` | Logowanie |
| `/onboarding` | Kreator nowego salonu |
| `/dashboard/pulpit` | Pulpit właściciela salonu |
| `/dashboard/kalendarz` | Kalendarz wizyt |
| `/dashboard/klienci` | Baza klientek |
| `/dashboard/polecenia` | Program poleceń |
| `/dashboard/magazyn` | Magazyn produktów |
| `/dashboard/finanse` | Przychody i koszty |
| `/dashboard/statystyki` | Wykresy i raporty |
| `/dashboard/automatyzacje` | SMS i szablony |
| `/dashboard/ustawienia` | Ustawienia salonu |
| `/salon/SLUG` | Publiczna strona salonu |
| `/umow/SLUG` | Rezerwacja online dla klientek |
| `/p/KOD` | Strona polecenia klientki |
| `/superadmin/dashboard` | Panel administratora platformy |

---

## KONTAKT I WSPARCIE

W razie problemów z wdrożeniem możesz:
- Sprawdzić logi w Vercel (Deployments → Build Logs)
- Sprawdzić logi w Supabase (Logs → API lub Auth)
- Otworzyć konsolę przeglądarki (F12 → Console) i sprawdzić błędy

---

*Referly v3 — Next.js 15 + React 18 + Supabase + Tailwind CSS*
