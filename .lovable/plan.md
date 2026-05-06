Saya akan kerjakan 5 hal besar. Karena ini scope luas, saya butuh konfirmasi sebelum mulai supaya tidak salah arah.

## 1. Bug "kehabisan kredit" pada plan tinggi
Penyebab: edge function `consume-credit` baru‑baru ini di‑hard‑gate dengan `role==="authenticated" && aud==="authenticated"`. Saat plan resolve gagal (mis. token role beda / cache), function balas 403 dan UI menampilkan "kredit habis". Plus `get_or_init_credits` di‑reset ketika plan berubah, sehingga jika klaim plan tidak konsisten antar request, saldo bisa "kelihatan habis".

**Fix:**
- Pakai `service_role` client untuk baca `user_roles`/plan dari DB (server‑side) – jangan percaya plan dari client.
- Pisahkan error 403 (forbidden) vs 402 (insufficient_credits) di UI; toast spesifik.
- Tambah endpoint `get-credits` ringan agar header chip bisa refresh tanpa konsumsi.

## 2. Sistem kuota harian (Free) + kredit bulanan (Paid)
Free plan dapat **daily limits** terpisah dari kredit bulanan:
- Fullstack: 5/hari
- AI Slides: 8/hari  
- AI Designer: 20/hari

Paid plan tetap pakai `user_credits` (image_credits, fullstack_credits) bulanan + bonus daily.

**Migration:**
```
ALTER TABLE user_credits ADD COLUMN
  daily_fullstack int DEFAULT 0,
  daily_slides    int DEFAULT 0,
  daily_designer  int DEFAULT 0,
  daily_reset_at  timestamptz DEFAULT now();
```
Update `consume_credit(_kind, _amount)` jadi 3‑tier:
1. Coba pakai daily quota dulu (reset tiap 24 jam).
2. Kalau habis & ada credits bulanan, potong dari `image_credits`/`fullstack_credits`.
3. Kalau habis semua → return false → UI tampilkan upgrade modal.

## 3. Naikkan harga plan (tetap promo besar)
| Plan | Harga lama | Harga baru | Original | Diskon |
|---|---|---|---|---|
| Senior  | Rp 8.000  | **Rp 19.000**  | Rp 89.000  | 78% |
| Superior| Rp 18.000 | **Rp 49.000**  | Rp 249.000 | 80% |
| nigown  | (tetap)   | **Rp 99.000**  | Rp 499.000 | 80% |

(Quota Senior 300 img/200 fs, Superior 1500/1000, nigown ∞ – tidak diubah.)

## 4. Ganti backend Fullstack ke LlamaCoder
Buat edge function baru `llamacoder` (Deno) yang port skrip Node ke Deno:
- POST `https://llamacoder.together.ai/api/create-chat`
- POST `/api/get-next-completion-stream-promise`
- Default model: `qwen3-coder` (Qwen3‑Coder 480B), fallback `deepseek-v3.1`.
- Skip fitur upload screenshot S3 (rumit, jarang dipakai) – bisa ditambah nanti.
- Streaming SSE balik ke client lewat existing AgentWorkspace.
- Output dipakai untuk: render TSX preview, download manifest (zip), download React project (JSZip → blob).

UI Workspace: tombol **Run TSX**, **Download Manifest**, **Download React**.

## 5. Bug chat history butuh reload
Penyebab: `AuthContext` setting `firebaseUid` setelah komponen Chat sudah mount, tapi loader history hanya dipanggil di `useEffect([])`.

**Fix:** ubah dependency loader ke `[firebaseUid, sessionId]` + tambah realtime subscribe ke `chat_sessions` untuk live update list.

---

## Pertanyaan sebelum mulai
1. **Harga baru OK?** Senior 19k / Superior 49k / nigown 99k — atau Anda mau angka lain?
2. **LlamaCoder**: setuju default `qwen3-coder`? (Paling jago coding di list itu.)
3. **Daily quota Free**: angka 5/8/20 sudah OK, atau mau geser?
4. **Skrip S3 upload screenshot** di LlamaCoder: skip dulu (lebih ringan & cepat) atau wajib port juga?

Setelah jawab ini, saya kerjakan **semuanya sekaligus** dalam satu loop: migration → edge functions → UI → fix bug.