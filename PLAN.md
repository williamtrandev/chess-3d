# PLAN: Kế hoạch thực hiện chess3d

> Thứ tự có chủ đích: **game chơi được và đẹp trước, hạ tầng sau**. Mỗi giai đoạn kết thúc bằng một kết quả demo được.
> Chi tiết kiến trúc xem `OVERVIEW.md`. Tiến độ thực tế xem `PROGRESS.md`.

## Giai đoạn 0: Thiết kế
- [x] Chốt ý tưởng, chế độ chơi, ngôn ngữ, đồ họa 3D
- [x] Chốt kiến trúc service, broker (Kafka + SQS), luồng ván online
- [ ] Duyệt các phần nháp trong OVERVIEW: bàn cờ 3D & giao diện, dữ liệu, xử lý lỗi, kiểm thử/CI/CD
- [ ] Viết ADR cho các quyết định chính (monorepo, Kafka + SQS, game-server stateful, outbox)

## Giai đoạn 1: Nền móng + chơi với máy (≈ 2 tuần)
**Kết quả:** mở web, chơi cờ 3D với Stockfish.
- [ ] Scaffold monorepo: pnpm, Turborepo, tsconfig, eslint, prettier, Vitest
- [ ] `packages/chess-core`: bọc chess.js, đồng hồ, xác định kết quả ván + unit test
- [ ] `packages/contracts`: khung schema Zod (socket, sự kiện, DTO)
- [ ] `apps/web`: Next.js, layout, trang chủ
- [ ] Bàn cờ 3D: quân cờ, bàn, camera, chọn/kéo thả, tô sáng, hiệu ứng di chuyển
- [ ] Stockfish WASM trong Web Worker, 8 cấp độ
- [ ] Âm thanh, theme, `Board2D` dự phòng
- [ ] CI tối thiểu: lint, typecheck, test

## Giai đoạn 2: Chơi online (≈ 2–3 tuần)
**Kết quả:** hai người chơi online với nhau qua link hoặc matchmaking.
- [ ] `infra/docker-compose.yml`: Postgres, Redis, Redpanda, Redpanda Console
- [ ] `apps/identity`: khách, đăng ký, đăng nhập, JWT + refresh token
- [ ] `apps/game-server`: Socket.IO, xác thực JWT, phòng ván, kiểm tra nước đi, đồng hồ server
- [ ] Matchmaking theo ELO (Redis ZSET, nới khoảng chênh)
- [ ] Snapshot vào Redis, kết nối lại, hủy ván, đầu hàng, hòa
- [ ] Rate limit socket
- [ ] Web: luồng tìm trận, ván online, đồng hồ, kết quả
- [ ] Integration test (Testcontainers) + E2E Playwright hai trình duyệt

## Giai đoạn 3: Event-driven + xếp hạng (≈ 2 tuần)
**Kết quả:** ELO, lịch sử, bảng xếp hạng, hồ sơ.
- [ ] `packages/messaging`: producer, outbox relay, idempotent consumer, retry + DLQ
- [ ] Outbox trong `game-server` và `identity`
- [ ] `apps/workers`: rating (ELO), achievement, analytics
- [ ] `apps/scores`: ratings, lịch sử, leaderboard (Redis + Postgres), REST API
- [ ] `rating.updated` → `game-server` → `game:ended` kèm ELO
- [ ] Web: leaderboard, hồ sơ, biểu đồ ELO, lịch sử ván
- [ ] `apps/catalog` tối thiểu (danh sách game, chuẩn bị cho game sau)

## Giai đoạn 4: AWS (LocalStack + Terraform) (≈ 1–2 tuần)
**Kết quả:** replay, ảnh chia sẻ, lịch tự động chạy trên AWS mô phỏng.
- [ ] LocalStack trong docker-compose; Terraform với `tflocal`
- [ ] S3 buckets, SQS + DLQ, DynamoDB, EventBridge Scheduler
- [ ] Bridge Kafka → SQS
- [ ] `apps/lambdas`: sinh PGN, replay JSON, ảnh chia sẻ → S3
- [ ] Lịch: reset leaderboard tuần, dọn ván treo
- [ ] Web: trang replay, nút chia sẻ

## Giai đoạn 5: Kubernetes + Observability + Load test (≈ 2 tuần)
**Kết quả:** hệ thống chạy trên k3d, tự scale, có dashboard và báo cáo tải.
- [ ] Dockerfile cho từng app (multi-stage, image nhỏ, non-root)
- [ ] Helm chart cho từng service + values dev/prod
- [ ] k3d cluster, Ingress, ArgoCD (GitOps)
- [ ] HPA; graceful drain cho `game-server`
- [ ] OpenTelemetry + Prometheus, Grafana, Loki, Tempo; dashboard + cảnh báo
- [ ] k6: kịch bản lướt trang, matchmaking, ván cờ qua WebSocket; báo cáo p95, throughput

## Giai đoạn 6: CI/CD hoàn chỉnh + hoàn thiện portfolio (≈ 1–2 tuần)
**Kết quả:** repo sẵn sàng đưa vào CV.
- [ ] CI đầy đủ: build image, Trivy, gitleaks, CodeQL, contract check, coverage
- [ ] CD: push GHCR → cập nhật Helm values → ArgoCD sync; smoke test sau deploy
- [ ] README: sơ đồ C4, cách chạy một lệnh, ảnh/GIF, kết quả load test
- [ ] ADR đầy đủ
- [ ] Video demo 2–3 phút; bản demo frontend trên hosting miễn phí
