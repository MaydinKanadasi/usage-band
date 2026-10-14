# usage-band

Claude Code için bir mod: mesaj kutusunun hemen üstüne küçük bir kullanım şeridi ekler.

| Hap | Gösterdiği |
| --- | --- |
| **5h** (turkuaz) | 5 saatlik limitin kullanılan yüzdesi, ilerleme çubuğu ve sıfırlanmaya kalan süre (`2h 40m`) |
| **7d** (mor) | 7 günlük limitin kullanılan yüzdesi, ilerleme çubuğu ve sıfırlanmaya kalan süre (`1d 7h`) |
| **$** (altın) | Oturumun API liste fiyatıyla maliyeti (`$4.32`) |

- Çubuk %70'in altında yeşil, %70'ten itibaren sarı, %90'dan itibaren kırmızı.
- Çubuğun üstündeki dikey çizgi pencerenin ne kadarının geçtiğini gösterir.
- Hapların üzerine gelince ayrıntı çıkar.
- 5h ve 7d limitleri hesabınızındır (Claude sohbetleri dahil); maliyet yalnızca o Code oturumunu sayar ve abonelikte ayrıca ödenmez.
- Limitler oturumdaki ilk model yanıtından sonra görünür ve 30 saniyede bir tazelenir.

Masaüstü uygulamasının Code sekmesinde renkli SVG haplar olarak (açık ve koyu temaya uyar), terminalde renkli metin olarak çizilir.

## Kurulum

Bir terminal oturumunda, Claude Code isteminde:

```
/plugin install usage-band --marketplace MaydinKanadasi/usage-band
```

Marketplace eklensin mi diye sorulduğunda `y`, ardından kapsam olarak kullanıcı kapsamını seçin. Kurulduktan sonra masaüstü uygulamasının Code sekmesindeki oturumlarda da çalışır.

Modlar (function hooks) erken erişimdedir; Claude Code sürümünüz bunları desteklemiyorsa `~/.claude/settings.json` içindeki `env` bloğuna `"CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"` ekleyin.

## Komut

| Komut | Ne yapar |
| --- | --- |
| `/kullanim` | Verileri yeniler ve tek satır özet yazar: `5h %20 (2h 40m) · 7d %58 (1d 7h) · $4.32` |
| `/kullanim gizle` | Şeridi kapatır |
| `/kullanim goster` | Şeridi geri açar |

## Geliştirme

```
claude plugin validate .
claude plugin test .
```

- `hooks/register.tsx`: olay kancaları ve `/kullanim` komutu
- `hooks/pills.ts`: biçimlendirme ve hapların SVG metni
- `types/index.d.ts`: `$.state` sözleşmesi
- `tests/band.test.ts`: masaüstü, terminal ve gizle/anket durumlarının testleri

## Lisans

[MIT](LICENSE)
