# 📈 Stock Alert Worker

Cloudflare Worker tự động phân tích cổ phiếu Việt Nam và gửi thông báo qua **ntfy.sh** (miễn phí, không cần đăng ký).

## Tính năng

- 🔄 Chạy tự động mỗi 15 phút trong giờ giao dịch (T2-T6, 7:00-15:30 giờ VN)
- 📊 Lấy dữ liệu từ TCBS API (không cần API key)
- 📐 Phân tích kỹ thuật: RSI(14), MACD(12,26,9), % thay đổi giá
- 🔔 Gửi thông báo qua **ntfy.sh** khi phát hiện tín hiệu mua/bán
- 📋 Quản lý danh mục theo dõi qua Cloudflare KV
- ⚡ HTTP API để xem kết quả và cập nhật watchlist

## Cài đặt

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo KV namespace

```bash
wrangler kv namespace create STOCK_KV
# Copy the ID vào wrangler.toml
```

### 3. Cập nhật wrangler.toml

```toml
[[kv_namespaces]]
binding = "STOCK_KV"
id = "abc123..."  # ID từ bước trên

[vars]
NTFY_TOPIC = "stock-alert-vn-YOUR_UNIQUE_SECRET"  # Đặt tên khó đoán!
```

### 4. Deploy

```bash
wrangler deploy
```

## Nhận thông báo

1. Cài app **ntfy** trên điện thoại: [ntfy.sh](https://ntfy.sh)
2. Subscribe topic: `stock-alert-vn-YOUR_UNIQUE_SECRET`
3. Hoặc xem trên web: `https://ntfy.sh/stock-alert-vn-YOUR_UNIQUE_SECRET`

> ⚠️ Dùng tên topic khó đoán vì ntfy.sh là public. Ai biết topic đều đọc được notification của bạn.

## HTTP API

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health` | Health check |
| POST | `/run` | Chạy phân tích ngay |
| GET | `/watchlist` | Xem danh sách cổ phiếu |
| PUT | `/watchlist` | Cập nhật danh sách |

### Ví dụ chạy phân tích ngay

```bash
curl -X POST https://YOUR_WORKER.workers.dev/run
```

### Ví dụ cập nhật watchlist

```bash
curl -X PUT https://YOUR_WORKER.workers.dev/watchlist \
  -H "Content-Type: application/json" \
  -d '{
    "stocks": [
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "buyDropPercent": 3,
        "sellRisePercent": 5,
        "rsiOversold": 30,
        "rsiOverbought": 70,
        "enabled": true
      }
    ]
  }'
```

## Tín hiệu mua/bán

### Tín hiệu MUA 🟢
- RSI ≤ 30 (oversold)
- Giá giảm ≥ X% trong 1 ngày
- MACD bullish crossover

### Tín hiệu BÁN 🔴
- RSI ≥ 70 (overbought)
- Giá tăng ≥ Y% trong 5 ngày (chốt lời)
- MACD bearish crossover

### Mức độ tín hiệu
- **STRONG** → Thông báo urgent (rung chuông)
- **MODERATE** → Thông báo high priority
- **WEAK** → Chỉ ghi log, không spam

## Danh mục mặc định

| Mã | Tên | Mua khi giảm | Bán khi tăng |
|----|-----|-------------|-------------|
| VNM | Vinamilk | -3% | +5% |
| FPT | FPT Corp | -3% | +5% |
| HPG | Hòa Phát | -4% | +6% |
| VIC | Vingroup | -3% | +5% |
| MWG | Mobile World | -4% | +6% |

⚠️ **Đây chỉ là phân tích kỹ thuật tự động, không phải khuyến nghị đầu tư!**
