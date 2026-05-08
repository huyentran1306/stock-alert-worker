# 📋 SETUP NOTES — Stock Alert Worker

## ✅ Đã hoàn thành (không cần làm gì thêm)

- [x] Worker đã deploy: https://stock-alert-worker.trann46698.workers.dev
- [x] KV namespace đã tạo (ID: `c352990e523447edb22884bd0ac0b9fa`)
- [x] Cron chạy mỗi 15 phút T2-T6 giờ giao dịch VN
- [x] Dữ liệu từ VPS Securities API (free, no key)
- [x] Watchlist mặc định: VNM, FPT, HPG, VIC, MWG

---

## ⚠️ VIỆC CẦN LÀM (bắt buộc)

### 1. Đổi NTFY_TOPIC thành tên bí mật của riêng bạn

Mở file `wrangler.toml`, đổi dòng này:

```toml
NTFY_TOPIC = "stock-alert-vn-tran46698-private"
```

→ Đổi thành tên khó đoán VÀ chỉ bạn biết, ví dụ:
```toml
NTFY_TOPIC = "stock-abc-xyz-2025-myname-secret123"
```

Sau đó deploy lại:
```bash
cd /Users/pro/stock-alert-worker
npx wrangler deploy
```

---

### 2. Cài app ntfy và subscribe topic

1. Tải app **ntfy** trên iPhone/Android: https://ntfy.sh
2. Mở app → Add subscription
3. Nhập topic: `stock-alert-vn-tran46698-private` (hoặc tên bạn đã đổi)
4. Hoặc xem trên web: https://ntfy.sh/stock-alert-vn-tran46698-private

> **Lý do dùng ntfy.sh**: Hoàn toàn miễn phí, không cần đăng ký, không cần API key.
> Chỉ cần nhớ topic name là nhận được notification!

---

## 🛠️ Tùy chỉnh thêm (không bắt buộc)

### Thêm/xóa cổ phiếu theo dõi

```bash
curl -X PUT https://stock-alert-worker.trann46698.workers.dev/watchlist \
  -H "Content-Type: application/json" \
  -d '{
    "stocks": [
      { "symbol": "VNM", "name": "Vinamilk", "buyDropPercent": 3, "sellRisePercent": 5, "rsiOversold": 30, "rsiOverbought": 70, "enabled": true },
      { "symbol": "FPT", "name": "FPT Corp", "buyDropPercent": 3, "sellRisePercent": 5, "rsiOversold": 30, "rsiOverbought": 70, "enabled": true },
      { "symbol": "TCB", "name": "Techcombank", "buyDropPercent": 4, "sellRisePercent": 6, "rsiOversold": 30, "rsiOverbought": 70, "enabled": true }
    ]
  }'
```

### Chạy phân tích thủ công ngay lập tức

```bash
curl -X POST https://stock-alert-worker.trann46698.workers.dev/run
```

### Xem watchlist hiện tại

```bash
curl https://stock-alert-worker.trann46698.workers.dev/watchlist
```

---

## 📊 Ý nghĩa tín hiệu

| Tín hiệu | Điều kiện | Nghĩa |
|----------|-----------|-------|
| 🟢 MUA STRONG | RSI < 20 hoặc giảm 2x ngưỡng | Cân nhắc mua mạnh |
| 🟢 MUA MODERATE | RSI ≤ 30 hoặc giảm ≥ X% | Cân nhắc mua |
| 🔴 BÁN STRONG | RSI > 80 hoặc tăng 1.5x ngưỡng | Cân nhắc bán mạnh |
| 🔴 BÁN MODERATE | RSI ≥ 70 hoặc tăng ≥ Y% | Cân nhắc bán/chốt lời |
| 🟡 WATCH | RSI gần vùng extreme | Theo dõi thêm |

> ⚠️ **Đây chỉ là tín hiệu kỹ thuật tự động, KHÔNG phải khuyến nghị đầu tư.
> Bạn vẫn tự quyết định mua/bán trên EzTrade của FPTS.**

---

## 🔗 Links

- Worker URL: https://stock-alert-worker.trann46698.workers.dev
- Cloudflare Dashboard: https://dash.cloudflare.com
- ntfy.sh: https://ntfy.sh
