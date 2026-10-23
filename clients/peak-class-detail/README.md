# Peak Class Detail: demo strony

Koncept: **„Czysty komfort.”**, mobilny detailing door to door. Ciemny motyw, jeden akcent (niebieski z jego cennika), font Archivo (szeroki krój na tytuły).

## Uruchomienie
```
cd site
npm install
npm run dev      # http://localhost:4321
npm run build    # gotowa strona w site/dist
```

## Gdzie wrzucić grafiki
| Co | Gdzie | Format |
|---|---|---|
| Hero: brudne / czyste, desktop | `site/public/hero/dirty-desktop.webp`, `clean-desktop.webp` | 16:9, 2560×1440 |
| Hero: brudne / czyste, telefon | `site/public/hero/dirty-phone.webp`, `clean-phone.webp` | 9:16, 1080×1920 |
| Wycięte auta (realizacje) | `site/src/assets/cutouts/<id>.png`, id: `audi-s5`, `golf-gti`, `mercedes-a45`, `bmw-f11`, `bmw-f45` | PNG z przezroczystością |

Obecne pliki hero to zastępcze grafiki (placeholder). Wycięte auta pojawią się same po wrzuceniu plików o tych nazwach.

## Źródła
`source/photos`, `source/videos`: materiały od klienta. `source/brand`: cennik, regulamin, logotypy. `source/refs`: inspiracje.
