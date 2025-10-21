# Restoran - Web aplikacija (v1 i v2)

Ovaj repozitorij sadrži dvije verzije aplikacije za školski projekt:

- v1 (frontend only) — HTML/CSS/JS, učenici mogu raditi lokalno i spremiti narudžbe/rezervacije kao JSON download.
  - Fajlovi: public/v1/index.html i public/v1/script_v1.js
  - Otvorite public/v1/index.html direktno u pregledniku ili koristite mali static server.

- v2 (full stack) — Node.js + Express + SQLite (API + server-side pohrana)
  - Pokretanje:
    1. instalirajte Node.js
    2. u root direktoriju: npm install
    3. npm start
    4. otvorite http://localhost:3000

Sadržaj repozitorija:
- package.json
- server.js
- db.js
- .gitignore
- public/ (sadrži v2 frontend i v1 folder za lokalnu verziju)

Aplikacija:
- Meni s 10 jela
- 10 stolova na terasi ("terasa") i 10 stolova u restoranu ("restoran")
- Narudžbe s načinom plaćanja (gotovina/kartica)
- Posebna forma za rezervacije (odvojeno od narudžbe)
