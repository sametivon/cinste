---
tur: rehber
---

# CINSTE'de AI ile çalışma

## 1. Bu ne işe yarar?

- ai-kit, kod ile dokümanı senkron tutar; işi repo içinde adım adım yürütür: **plan → uygula → incele → belgele → kapat**.
- İşin durumu repoda saklanır; yeni oturumda `ai-kit next` ile kaldığın yerden devam edersin.
- Kapılar model çağırmadan dosya, git ve test komutlarıyla kontrol yapar.

## 2. Gereksinimler

- Git ve Python **3.11+**; ai-kit için dış Python paketi gerekmez.
- Proje için **Node 22 + npm** (nvm ile: `nvm install 22`, `nvm use 22`).
- **Claude Code veya Codex CLI**; biri yeterlidir.
- **tmux + tmux-bridge** yalnız çoklu ajan çalışması için isteğe bağlıdır.

## 3. Kurulum

- ai-kit GitHub reposu **özeldir (private)** ve henüz bir marketplace'te yayınlanmadı. Repo sahibinden collaborator olarak eklenmeyi iste; erişim yoksa klonlama `Repository not found` veya kimlik doğrulama hatası verir.
- GitHub kimlik doğrulaması gerekir: SSH anahtarını hesabına ekle veya `gh auth login` ile HTTPS için giriş yap. Aşağıdaki iki klon yolundan birini seç.
- `$HOME` aşağıdaki komutlarda mutlak yola açılır; yerel marketplace'e `.` verme.

```bash
# SSH anahtarıyla
git clone git@github.com:AtaMesutKilinc/ai-kit.git "$HOME/.local/share/ai-kit"
# Alternatif: gh auth login sonrası HTTPS
git clone https://github.com/AtaMesutKilinc/ai-kit "$HOME/.local/share/ai-kit"
export PATH="$HOME/.local/share/ai-kit/bin:$PATH"
```

- Kullandığın araca göre **bir** plugin kurulumu seç:

```bash
# Claude Code
claude plugin marketplace add "$HOME/.local/share/ai-kit"
claude plugin install ai-kit@ai-kit

# Codex CLI
codex plugin marketplace add "$HOME/.local/share/ai-kit"
codex plugin add ai-kit@ai-kit-local
```

- Codex'i **tamamen kapatıp aç**; `/clear` yetmez. `/hooks` ekranında ai-kit **SessionStart** ve **Stop** tanımlarını inceleyip **Trusted** yap.
- CINSTE zaten init edilmiş: **`ai-kit init` çalıştırma**.
- Repo kökünde proje bağımlılıklarını kur:

```bash
npm ci
npm --prefix apps/mobile ci
```

- Ortam kurulumu için kök README'deki [Local setup](../../README.md#local-setup) bölümünü izle. `.env.local` değerleri bu rehberde yer almaz.
- Terminalde `ai-kit` bulunamazsa yukarıdaki `export PATH` satırını tekrar çalıştır; plugin kendi paket CLI'sını da kullanır.

## 4. Doküman yapısı

| Yol | Ne için okunur? |
|---|---|
| `docs/decisions/` | Onaylı ürün kararları: [project.md](../decisions/project.md), [impact-spec.md](../decisions/impact-spec.md), [brand.md](../decisions/brand.md) |
| `docs/guides/` | Uygulama rehberleri; UI için [design-system.md](design-system.md) |
| `docs/current/` | Bugünkü davranış ve doğrulama kaydı: [current-state.md](../current/current-state.md) |
| `docs/features/` | İş planları ve ai-kit akış durumu |
| `docs/archive/` | Eski auditler ve geçmiş; varsayılan çalışma bağlamı değildir |

- Ajan kuralları için [AGENTS.md](../../AGENTS.md) tek kaynaktır; [CLAUDE.md](../../CLAUDE.md), `@AGENTS.md` ile ona yönlendirir.
- Mobil işlerde [apps/mobile/AGENTS.md](../../apps/mobile/AGENTS.md) ek kurallarını da oku.
- **Oturumu her zaman repo kökünden başlat.** Alt klasörden açılırsa kök AGENTS.md yüklenmeyebilir.
- Yalnız göreve ilgili dokümanları oku; tüm repoyu her işte bağlama alma.

## 5. Hook'lar ve skill'ler

- **SessionStart:** oturum başında `ai-kit doctor` özetini bağlama ekler.
- **Stop:** aktif, başlamış bir **uygula** adımı varken kapılar düşerse durmayı engeller ve bulguları ajana verir.
- Skill'ler kendiliğinden tetiklenmez; açıkça çağır:
  - Claude: `/ai-kit:ai-kit-feature <id>` (tek adım), `/ai-kit:ai-kit-status` (salt okunur durum).
  - Codex: `ai-kit-feature` ve `ai-kit-status` skill'lerini adıyla iste; feature için `<id>` belirt.

## 6. Kapılar

| Kapı | Kısa kontrol |
|---|---|
| `doc_match` | Koda bağlı doküman, kod değişince güncellendi mi? |
| `test_coverage` | Kaynak kod değişikliğine test değişikliği eşlik ediyor mu? |
| `test_targeted` | Değişen testler geçiyor mu? |
| `test_full` | Web ve mobil tam test takımları geçiyor mu? |
| `uncovered_code` | Yeni kodun doküman kapsamı var mı? Eski kod için baseline uyarısı verir. |
| `links` | Dokümanlardaki göreli bağlantılar geçerli mi? |
| `secret_scan` | Değişen dosyalarda secret veya kişisel veri var mı? |
| `loss` | Doküman izinsiz silindi veya taşındı mı? |
| `endpoint` | Java/Spring endpoint dokümanı kontrolü; CINSTE'de `skip`. |

## 7. Günlük akış

```bash
ai-kit feature new "ad"   # Üretilen F-… kimliğini al
ai-kit next <id>          # Adımı, bağlamı ve kapıları oku
ai-kit start <id>         # Adımı başlat; değişiklik öncesi git görüntüsü alınır
# Gösterilen adımı yap
ai-kit done <id>          # Kapı düşerse düzelt ve tekrar dene
ai-kit durum             # İşlerin durumunu gör
ai-kit check             # Etkin kapıları ve şemayı kontrol et
```

- Her adımda `next → start → işi yap → done` döngüsünü tekrarla; skill çağrısı yalnız sıradaki tek adımı yürütür.
- İnsan onayı gereken yerde açık onay al; durum dosyasını elle değiştirerek kapatma.

## 8. Başlangıç prompt'ları

Claude Code'a kopyala; `<id>` ve görev alanlarını doldur:

```text
Görev: <yapılacak iş>. Feature: <id>.
AGENTS.md ve yalnız göreve ilgili docs'u oku.
Feature yoksa önce ai-kit feature new "<ad>" ile oluştur; plan adımında onayımı bekle.
/ai-kit:ai-kit-feature <id> ile ai-kit akışını kullan:
ai-kit next ile adımı al, start ile başlat, yap ve done ile kapat;
kapı düşerse düzelt. Sonraki adımı da açık skill çağrısıyla yürüt.
docs/decisions içindeki onaylı ürün kararlarını değiştirme.
RLS/yetkiyi zayıflatma; secret, QR sırrı veya servis anahtarı ifşa etme.
Commit/push yalnız kullanıcı onayıyla. Bitince kısa özet ve kontrol sonucu ver.
```

Codex'e kopyala; `<id>` ve görev alanlarını doldur:

```text
Görev: <yapılacak iş>. Feature: <id>.
AGENTS.md ve yalnız göreve ilgili docs'u oku.
Feature yoksa önce ai-kit feature new "<ad>" ile oluştur; plan adımında onayımı bekle.
ai-kit-feature skill'ini <id> için kullanarak ai-kit akışıyla çalış:
ai-kit next ile adımı al, start ile başlat, yap ve done ile kapat;
kapı düşerse düzelt. Sonraki adımı da açık skill çağrısıyla yürüt.
docs/decisions içindeki onaylı ürün kararlarını değiştirme.
RLS/yetkiyi zayıflatma; secret, QR sırrı veya servis anahtarı ifşa etme.
Commit/push yalnız kullanıcı onayıyla. Bitince kısa özet ve kontrol sonucu ver.
```

## 9. Sorun giderme

- **Hook çalışmıyor:** Codex'i tamamen yeniden başlat; `/hooks` içinde iki ai-kit hook'unun Trusted ve aktif olduğunu kontrol et.
- **`test_full` 127:** bağımlılıklar kurulmamış olabilir; repo kökünde `npm ci` ve `npm --prefix apps/mobile ci` çalıştır.
- **Codex sandbox'ında npm log/izin hatası:** gereken komutu ek izin isteyerek çalıştır; izin olmadan sandbox'ı aşmaya çalışma.
- **Kapı başarısız:** rapordaki dosyayı/eksikliği düzelt, `done <id>` veya `check` komutunu yeniden çalıştır.
