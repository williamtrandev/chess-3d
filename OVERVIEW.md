# OVERVIEW: Kiến trúc và nghiệp vụ hệ thống chess3d

> Tài liệu nguồn sự thật cho kiến trúc và nghiệp vụ. Ngày tạo: 2026-10-07.
>
> Trạng thái các phần:
> - Mục 0–5 (mục tiêu, kiến trúc, monorepo & công nghệ, nghiệp vụ, luồng ván online, message broker): **đã duyệt**
> - Mục 6–9 (bàn cờ 3D & giao diện, dữ liệu, xử lý lỗi, kiểm thử/CI/CD/observability): **bản nháp, chờ duyệt**

---

## 0. Mục tiêu

- Một **nền tảng web game** chịu được lượng lớn người chơi, game đầu tiên là **cờ vua 3D**.
- Chế độ chơi: **online** (khách hoặc tài khoản, matchmaking theo ELO) và **đánh với máy** (Stockfish, nhiều cấp độ).
- Thể hiện năng lực: microservices có lý do rõ ràng, event-driven với Kafka, dịch vụ AWS (mô phỏng), Kubernetes, CI/CD, observability, load test.
- **Chi phí 0đ:** toàn bộ chạy local. Bản demo công khai (nếu có) chỉ là frontend trên hosting miễn phí và video.

### Ngoài phạm vi bản đầu
Chat, bạn bè, xem trực tiếp (spectator), giải đấu, phân tích ván bằng engine phía server, upload game của bên thứ ba, thanh toán.

---

## 1. Tổng quan kiến trúc

```
                         Người chơi
                             │
 ① EDGE      CDN ── S3: web tĩnh, asset 3D, replay
                             │
 ② GATEWAY   Ingress / Load Balancer: TLS, rate limit, định tuyến
                 │                                  │
           REST (HTTP)                       WebSocket (Socket.IO)
                 │                                  │
 ③ STATELESS  identity · scores · catalog     ④ STATEFUL  game-server ×N
                 │                                  │      (ván cờ trong RAM,
                 │                                  │       snapshot vào Redis)
 ⑤ DATA      Postgres (schema riêng mỗi service) · Redis · DynamoDB · S3
                 │
 ⑥ ASYNC     Kafka (event bus) ──► workers (rating, achievement, analytics)
                                └─► bridge ──► SQS ──► Lambda (replay, ảnh chia sẻ → S3)
                 │
 ⑦ OBSERVE   OpenTelemetry → Prometheus · Grafana · Loki · Tempo
```

### Danh sách service

| Service | Loại | Trách nhiệm | Scale |
|---|---|---|---|
| `web` | Frontend | Portal, bàn cờ 3D, chơi với máy (Stockfish WASM trong Web Worker) | Tĩnh/SSR, CDN |
| `identity` | Stateless | Đăng ký, đăng nhập, chơi khách, cấp JWT | Theo CPU |
| `game-server` | **Stateful** | Matchmaking, phòng ván cờ, kiểm tra nước đi, đồng hồ, kết thúc ván | Theo số kết nối / ván đang chạy |
| `scores` | Stateless | ELO, lịch sử ván, bảng xếp hạng | Theo CPU; leaderboard bằng Redis |
| `catalog` | Stateless | Danh sách game, game hot (chuẩn bị cho game sau) | Cache nặng |
| `workers` | Consumer | Tính ELO, thành tựu, thống kê từ sự kiện Kafka | Theo consumer lag |
| `lambdas` | Event-driven | Sinh PGN, replay, ảnh chia sẻ → S3 | Tự scale theo SQS |

### Các pod là gì (ghi chú)
Mỗi service được build thành một Docker image. Trên Kubernetes, mỗi bản đang chạy của service là một **pod**. Một service có thể chạy nhiều pod giống hệt nhau để chia tải (scale ngang). Khi dev bằng `pnpm dev`, mỗi service chỉ là một tiến trình Node thường.

---

## 2. Monorepo và công nghệ *(đã duyệt)*

```
chess3d/
├── apps/
│   ├── web/              Next.js + React Three Fiber
│   ├── identity/         NestJS
│   ├── game-server/      NestJS + Socket.IO
│   ├── scores/           NestJS
│   ├── catalog/          NestJS
│   ├── workers/          Kafka consumers
│   └── lambdas/          AWS Lambda handlers
├── packages/
│   ├── chess-core/       luật cờ (bọc chess.js), đồng hồ, kết quả ván
│   ├── contracts/        schema sự kiện Kafka, giao thức Socket.IO, DTO REST (Zod)
│   ├── messaging/        Kafka producer, outbox relay, idempotent consumer, DLQ
│   ├── observability/    OpenTelemetry, logger
│   └── tsconfig/, eslint-config/
├── infra/
│   ├── docker-compose.yml
│   ├── terraform/        S3, SQS, DLQ, Lambda, DynamoDB, EventBridge (trỏ LocalStack)
│   ├── helm/
│   └── k8s/argocd/
├── tests/load/           k6
├── docs/adr/, docs/diagrams/
└── .github/workflows/
```

| Hạng mục | Lựa chọn |
|---|---|
| Ngôn ngữ | TypeScript ở mọi nơi (dùng chung luật cờ và contracts giữa client và server) |
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js, React Three Fiber + drei, Zustand, Tailwind, Framer Motion, Stockfish WASM |
| Backend | NestJS, Socket.IO + Redis adapter |
| Dữ liệu | Postgres + Prisma, Redis, DynamoDB, S3 |
| Broker | Kafka API (Redpanda khi chạy local) + SQS |
| AWS local | LocalStack + Terraform (`tflocal`) |
| Kubernetes | k3d, Helm, ArgoCD |
| Test | Vitest, Testcontainers, Playwright, k6 |

**Monorepo khác microservices:** monorepo là cách lưu code (một repo). Microservices là cách chạy (nhiều tiến trình độc lập). Các service trong repo vẫn chạy tách biệt và giao tiếp qua mạng (REST, Socket.IO, Kafka).

---

## 3. Nghiệp vụ

### 3.1 Người chơi
- **Khách:** vào là chơi được ngay, nhận JWT khách (tên ngẫu nhiên, ví dụ `Guest-7F3A`). Khách chỉ chơi ván **không tính điểm** và chỉ được ghép với khách.
- **Tài khoản:** đăng ký bằng username, email, mật khẩu (băm bằng argon2). Có ELO, lịch sử, xếp hạng.
- Access token 15 phút; refresh token 7 ngày trong cookie httpOnly.

### 3.2 Thể thức thời gian
| Nhóm | Thể thức | ELO riêng |
|---|---|---|
| Bullet | 1+0, 2+1 | có |
| Blitz | 3+2, 5+0 | có |
| Rapid | 10+0, 15+10 | có |

### 3.3 ELO
- Điểm khởi đầu 1200 cho mỗi nhóm thể thức.
- Hệ số K = 40 cho 30 ván đầu, sau đó K = 20.
- Công thức: `E = 1 / (1 + 10^((Rđối thủ − Rmình)/400))`, `R' = R + K × (S − E)` với S = 1 / 0.5 / 0.
- Ván bị hủy (chưa ai đi nước nào trong 30 giây) không tính điểm.

### 3.4 Kết thúc ván
Chiếu hết, hết giờ, đầu hàng, hòa đồng ý, hết nước đi (stalemate), không đủ quân chiếu hết, lặp 3 lần, luật 50 nước, bỏ cuộc (mất kết nối quá 60 giây và đối thủ nhận thắng), hủy ván.
Lưu ý: hết giờ nhưng đối thủ không đủ quân để chiếu hết thì ván hòa.

### 3.5 Chơi với máy
- Stockfish WASM chạy trong Web Worker của trình duyệt, không tốn tài nguyên server.
- 8 cấp độ (giới hạn skill level và độ sâu tìm kiếm). Không tính ELO.
- Người đăng nhập được lưu kết quả vào hồ sơ (gửi về `scores` dạng ván không xếp hạng).

### 3.6 Bảng xếp hạng
- Theo từng nhóm thể thức: toàn thời gian và theo tuần.
- Redis Sorted Set là nguồn đọc nhanh; Postgres của `scores` là nguồn lưu trữ lâu dài.
- Reset bảng tuần bằng lịch EventBridge mỗi thứ Hai 00:00 (giờ Việt Nam).

---

## 4. Luồng một ván cờ online *(đã duyệt)*

1. Người chơi lấy JWT từ `identity` (khách hoặc tài khoản).
2. Gửi `queue:join` qua WebSocket tới `game-server`. Người chơi được thêm vào hàng chờ Redis (ZSET theo ELO).
3. Matchmaker chạy mỗi 1 giây, ghép cặp theo ELO: ban đầu chênh tối đa ±50, mỗi 5 giây chờ nới thêm 50. Khách chỉ ghép với khách.
4. Tạo ván, ghi `game:{id}:owner → pod`. Gửi `match:found`, rồi `game:state` cho cả hai.
5. Mỗi nước đi: client gửi `game:move`, server kiểm tra bằng `chess-core`, trừ đồng hồ theo thời gian server, lưu snapshot vào Redis, phát `game:moved` cho cả hai. Client hiển thị trước (optimistic) và quay lại nếu nhận `game:rejected`.
6. Kết thúc ván: lưu kết quả và bản ghi outbox trong **cùng một transaction** Postgres. Outbox relay đẩy `game.finished` lên Kafka.
7. `workers` (rating) tính ELO, ghi vào `scores`, phát `rating.updated`. `game-server` nghe sự kiện này rồi gửi `game:ended` kèm ELO mới cho người chơi. Song song đó, bridge đẩy tác vụ vào SQS để Lambda sinh PGN, replay và ảnh chia sẻ lưu lên S3.

### Scale ngang và mất kết nối
- Mỗi ván được gắn với một pod `game-server`. Redis lưu `game:{id}:owner`.
- Người chơi kết nối lại vào pod khác thì được chuyển tiếp tới pod đang giữ ván (Socket.IO Redis adapter).
- Snapshot ván lưu sau mỗi nước đi. Pod chết thì pod khác nhận quyền sở hữu (lease trong Redis hết hạn), nạp snapshot và ván chơi tiếp.
- Mất kết nối: đồng hồ vẫn chạy. Sau 60 giây đối thủ được quyền nhận thắng.
- Deploy: graceful drain. Pod cũ ngừng nhận ván mới; ván đang chơi được chuyển sang pod khác qua snapshot.

### Giao thức Socket.IO
| Hướng | Sự kiện | Payload |
|---|---|---|
| C→S | `queue:join` / `queue:leave` | `{ timeControl }` |
| C→S | `game:move` | `{ gameId, from, to, promotion?, clientSeq }` |
| C→S | `game:resign`, `game:offerDraw`, `game:respondDraw` | `{ gameId, accept? }` |
| S→C | `match:found` | `{ gameId, color, opponent, timeControl }` |
| S→C | `game:state` | `{ fen, moves[], clocks, status }` |
| S→C | `game:moved` | `{ move, fen, clocks, seq }` |
| S→C | `game:rejected` | `{ clientSeq, reason }` |
| S→C | `game:ended` | `{ result, reason, ratingChange? }` |

Rate limit: tối đa 10 sự kiện mỗi giây trên một kết nối.

---

## 5. Message broker *(đã duyệt)*

- **Kafka (event bus):** ghi lại "điều gì đã xảy ra". Nhiều consumer cùng đọc; giữ sự kiện 7 ngày nên đọc lại được (replay).
- **SQS → Lambda (hàng đợi tác vụ):** tác vụ nặng cần làm đúng một lần; có retry và DLQ.

### Topic
| Topic | Sự kiện | Key | Producer | Consumer |
|---|---|---|---|---|
| `game.events` | `game.started`, `game.finished`, `game.aborted` | `gameId` | game-server | workers (rating, achievement, analytics), bridge → SQS |
| `player.events` | `player.registered` | `userId` | identity | scores |
| `rating.events` | `rating.updated` | `userId` | workers | game-server, scores |
| `*.dlq` | sự kiện lỗi | giữ nguyên | messaging lib | xử lý tay |

### Envelope sự kiện
```ts
{
  eventId: string;        // ULID, dùng cho idempotency
  type: string;           // "game.finished"
  version: number;        // 1
  occurredAt: string;     // ISO 8601
  key: string;            // partition key
  traceparent?: string;   // lan truyền trace OpenTelemetry
  data: unknown;          // schema Zod theo type + version
}
```

### Pattern bắt buộc
1. **Transactional Outbox:** ghi dữ liệu và bảng `outbox` trong cùng một transaction; relay đẩy lên Kafka rồi đánh dấu `published_at`.
2. **Idempotent consumer:** bảng `processed_events(event_id, consumer)` để bỏ qua sự kiện trùng.
3. **Thứ tự:** cùng key thì cùng partition, nên được xử lý đúng thứ tự.
4. **Retry + DLQ:** retry có backoff 3 lần, sau đó chuyển vào `<topic>.dlq`.
5. **Schema có version** trong `packages/contracts`; CI kiểm tra tương thích ngược.

---

## 6. Bàn cờ 3D và giao diện *(bản nháp, chờ duyệt)*

### Trang
| Đường dẫn | Nội dung |
|---|---|
| `/` | Trang chủ: chơi nhanh (chọn thể thức), chơi với máy, bảng xếp hạng thu gọn |
| `/play/ai` | Chọn cấp độ máy và màu quân |
| `/game/[id]` | Ván đang chơi (online hoặc máy) |
| `/replay/[id]` | Xem lại ván |
| `/leaderboard` | Bảng xếp hạng theo thể thức, toàn thời gian / theo tuần |
| `/u/[username]` | Hồ sơ: ELO, biểu đồ ELO, lịch sử ván |
| `/login`, `/register` | Xác thực |

### Bàn cờ 3D
- React Three Fiber + drei. Quân cờ: tốt, xe, tượng, hậu, vua dựng bằng `LatheGeometry` (không cần file model); quân mã dùng model glTF giấy phép CC0.
- Ánh sáng: HDRI environment, bóng đổ mềm (ContactShadows), bloom nhẹ khi chiếu tướng.
- Camera xoay giới hạn góc; tự xoay bàn theo màu quân; có góc nhìn thẳng từ trên xuống.
- Tương tác: bấm chọn và kéo thả (raycast); tô sáng ô đi được, nước đi cuối, ô vua bị chiếu.
- Hiệu ứng: quân di chuyển theo đường cong, quân bị ăn bay khỏi bàn, rung nhẹ khi chiếu hết, âm thanh cho từng hành động.
- Theme: 3 bộ bàn/quân (gỗ, đá cẩm thạch, neon).
- Hiệu năng: tự giảm DPR và tắt hậu kỳ trên máy yếu (`PerformanceMonitor`); tải Canvas theo kiểu lazy.

### Ghi chú triển khai (Giai đoạn 1)
- Quân mã dựng bằng `ExtrudeGeometry` từ hình nhìn ngang thay cho model glTF: không phụ thuộc file tải ngoài.
- Ánh sáng môi trường dùng `Lightformer` của drei thay cho HDRI tải từ CDN; bóng đổ mềm từ directional light thay cho `ContactShadows`.
- Ván với máy dùng đường dẫn `/game/ai?level=&color=`; thêm `/game/local` (hai người một máy). `/game/[id]` cho ván online ở Giai đoạn 2.
- Bàn cờ đặt giữa khung cảnh 3D chọn được: **Đồng quê**, **Bãi biển**, **Phòng tối**. Canvas phủ toàn màn hình, panel kính mờ nổi phía trên; trang chủ cũng dùng khung cảnh làm nền. Mọi thứ dựng bằng code/shader, không tải asset ngoài.
- Chất lượng đồ họa tự hạ khi FPS giảm (ít cỏ hơn, tắt hậu kỳ, giảm DPR).

### Tách logic khỏi hiển thị
- Store (Zustand) giữ trạng thái ván, độc lập với Three.js.
- Bàn cờ hiển thị qua interface `BoardView`. Bản đầu là `Board3D`; có `Board2D` đơn giản làm dự phòng (máy không hỗ trợ WebGL) và để test E2E dễ hơn.

---

## 7. Dữ liệu *(bản nháp, chờ duyệt)*

### Postgres (mỗi service một schema)
**identity**
- `users(id, username UNIQUE, email UNIQUE, password_hash, created_at)`
- `refresh_tokens(id, user_id, token_hash, expires_at, revoked_at)`
- `outbox(...)`

**game** (game-server)
- `games(id, white_id, black_id, white_is_guest, black_is_guest, time_control, category, rated, status, result, reason, pgn, started_at, ended_at)`
- `outbox(id, aggregate_id, type, version, payload JSONB, created_at, published_at)`

**scores**
- `ratings(user_id, category, rating, games_played, updated_at)` PK `(user_id, category)`
- `rating_history(id, user_id, category, game_id, before, after, created_at)`
- `game_summaries(game_id, white_id, black_id, result, reason, category, ended_at)`: bản sao từ sự kiện
- `processed_events(event_id, consumer, processed_at)`

### Redis
| Key | Kiểu | Mục đích |
|---|---|---|
| `mm:queue:{timeControl}` | ZSET | Hàng chờ matchmaking (score = ELO) |
| `game:{id}:state` | HASH | Snapshot ván (FEN, nước đi, đồng hồ, seq) |
| `game:{id}:owner` | STRING + TTL | Pod đang giữ ván (lease) |
| `lb:{category}:all` / `lb:{category}:week:{yyyy-ww}` | ZSET | Bảng xếp hạng |
| `presence:{userId}` | STRING + TTL | Đang online |

### AWS (LocalStack)
| Tài nguyên | Mục đích |
|---|---|
| S3 `chess3d-replays` | PGN, JSON replay |
| S3 `chess3d-share` | Ảnh chia sẻ kết quả ván |
| S3 `chess3d-web` | Build tĩnh của web |
| SQS `replay-jobs` + `replay-jobs-dlq` | Tác vụ sinh replay và ảnh |
| DynamoDB `player-activity` | Luồng hoạt động người chơi (PK `userId`, SK `occurredAt`) |
| EventBridge Scheduler | Reset bảng xếp hạng tuần; dọn ván treo |

---

## 8. Xử lý lỗi *(bản nháp, chờ duyệt)*

| Tình huống | Cách xử lý |
|---|---|
| Nước đi không hợp lệ / sai lượt / `clientSeq` cũ | `game:rejected`, client quay lại trạng thái cũ |
| Spam sự kiện socket | Rate limit 10 sự kiện/giây, vượt thì ngắt kết nối |
| Mất kết nối | Đồng hồ vẫn chạy; kết nối lại thì nhận `game:state`; quá 60 giây đối thủ được nhận thắng |
| Pod `game-server` chết | Lease hết hạn → pod khác nạp snapshot và tiếp tục ván |
| Kafka tạm thời không truy cập được | Outbox giữ sự kiện, relay retry; ván vẫn kết thúc bình thường |
| Consumer lỗi | Retry 3 lần có backoff → DLQ; cảnh báo khi DLQ có tin |
| `scores` chậm hoặc sập | Chơi vẫn được; ELO cập nhật sau khi service phục hồi (nhờ Kafka); circuit breaker cho các lời gọi REST đọc ELO |
| Lambda lỗi | SQS retry → DLQ; replay không có thì trang replay dựng lại từ PGN trong Postgres |

---

## 9. Kiểm thử, CI/CD, Observability *(bản nháp, chờ duyệt)*

### Kiểm thử
| Tầng | Công cụ | Phạm vi |
|---|---|---|
| Unit | Vitest | `chess-core`, ELO, matchmaker, đồng hồ, outbox |
| Contract | Vitest + Zod | Schema sự kiện và socket; tương thích ngược |
| Integration | Testcontainers | Service + Postgres + Redis + Redpanda thật |
| E2E | Playwright | Hai trình duyệt chơi một ván online đến chiếu hết; chơi với máy |
| Tải | k6 | 10.000 người dùng ảo: lướt trang, tìm trận, giữ kết nối và đi nước |

### CI (GitHub Actions)
- **Pull request:** cài đặt (có cache) → lint, typecheck → unit → integration (chỉ phần bị ảnh hưởng, qua Turborepo) → build image → quét Trivy, gitleaks, CodeQL → kiểm tra contract.
- **main:** build và push image lên GHCR (tag theo commit SHA) → cập nhật tag image trong `infra/helm/values-*.yaml` → ArgoCD trên k3d tự đồng bộ (GitOps).
- Có thể dùng self-hosted runner trên máy cá nhân để deploy thật vào k3d và chạy smoke test sau deploy.

### Observability
- OpenTelemetry trong mọi service; `traceparent` được lan truyền qua header Kafka để có trace xuyên suốt: socket → game-server → Kafka → worker.
- Chỉ số chính: `ws_connections`, `active_games`, `move_latency_ms`, `matchmaking_wait_seconds`, `kafka_consumer_lag`, `outbox_pending`, `dlq_messages`.
- Grafana: dashboard cho từng service và dashboard tổng; cảnh báo khi p95 độ trễ nước đi > 150ms, consumer lag tăng liên tục, DLQ có tin.

### Deploy trên Kubernetes
- Service stateless: rolling update, HPA theo CPU.
- `game-server`: HPA theo số kết nối; `preStop` hook để drain; `terminationGracePeriodSeconds` đủ dài để chuyển ván.
