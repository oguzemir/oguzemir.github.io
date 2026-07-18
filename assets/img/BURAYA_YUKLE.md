# Görsel Yükleme Rehberi

Site, aşağıdaki dosya adlarını otomatik olarak arar. Dosya yoksa şık bir
placeholder gösterilir — yani görselleri sonradan eklemen yeterli,
kod değiştirmene gerek yok.

## Profil fotoğrafı
- `assets/img/profile.jpg` → "Hakkımda" bölümündeki fotoğraf çerçevesi ✅ yüklü
- Önerilen: dikey (4:5), en az 800×1000 px

## Proje görselleri → `assets/img/projects/` klasörüne
| Dosya adı            | Proje                   | Durum |
|----------------------|-------------------------|-------|
| `rise-online.jpg`    | Rise Online World       | ✅    |
| `volt.jpg`           | V.O.L.T                 | ✅    |
| `reflection.jpg`     | Reflection: The Greed   | ✅    |
| `rogue-legend.webp`  | Rogue Legend            | ✅    |
| `old-war.jpg`        | Old War: Legacy of Ate  | ✅    |
| `slime-spy.jpg`      | Slime Spy 2             | ✅    |
| `road-crashers.jpg`  | Road Crashers           | ✅    |

- Önerilen: yatay (16:9), en az 1280×720 px
- Yeni proje eklemek istersen: `js/i18n.js` içindeki `PROJECTS` listesine
  yeni bir kayıt ekle; görsel adı varsayılan olarak `<slug>.jpg`,
  farklı uzantı için kayda `img: "dosya.webp"` alanı ekle.

## Araç logoları → `assets/img/logos/`
Yetenek kartlarında kullanılıyor: maya, blender, python, spine, unity,
unreal (.svg). Kaynak: Simple Icons (cdn.simpleicons.org).
