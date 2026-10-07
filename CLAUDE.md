# chess3d: Nền tảng web game (cờ vua 3D) chịu tải lớn

Dự án portfolio fullstack: nền tảng web game với game đầu tiên là **cờ vua 3D** (chơi online xếp hạng ELO và chơi với máy). Hệ thống được thiết kế theo kiến trúc microservices, giao tiếp qua Kafka, dùng dịch vụ AWS mô phỏng bằng LocalStack và chạy hoàn toàn local (k3d), có đầy đủ CI/CD và observability.

## Tài liệu dự án: đọc trước khi làm

| File | Nội dung | Khi nào cập nhật |
|---|---|---|
| `OVERVIEW.md` | Toàn bộ kiến trúc + nghiệp vụ (nguồn sự thật) | Khi thay đổi kiến trúc, nghiệp vụ, hợp đồng giữa service |
| `PLAN.md` | Kế hoạch thực hiện theo giai đoạn | Khi thêm hoặc đổi phạm vi công việc |
| `PROGRESS.md` | Tiến độ thực tế, đang làm gì, vướng gì | **Sau mỗi phiên làm việc / mỗi task hoàn thành** |
| `docs/adr/` | Quyết định kiến trúc (ADR) | Khi đưa ra quyết định kỹ thuật quan trọng |

## Kiến trúc tóm tắt

- **Monorepo** (pnpm workspaces + Turborepo). Code chung một repo, nhưng mỗi app build thành Docker image riêng và chạy như service độc lập.
- **apps/**: `web` (Next.js + React Three Fiber), `identity`, `game-server` (Socket.IO, stateful), `scores`, `catalog`, `workers` (Kafka consumers), `lambdas`.
- **packages/**: `chess-core` (luật cờ dùng chung), `contracts` (schema sự kiện / socket / DTO bằng Zod), `messaging` (Kafka producer, outbox, idempotent consumer, DLQ), `observability`.
- **Broker:** Kafka (Redpanda khi chạy local) làm event bus giữa các service; SQS → Lambda cho tác vụ nặng chạy một lần.
- **Dữ liệu:** Postgres (mỗi service một schema riêng), Redis (cache, matchmaking, snapshot ván, leaderboard), DynamoDB, S3.
- **Hạ tầng:** Docker Compose (dev), LocalStack + Terraform (AWS), k3d + Helm + ArgoCD (Kubernetes/GitOps), OpenTelemetry + Prometheus/Grafana/Loki/Tempo.

## Quy tắc bắt buộc

1. **Server làm trọng tài.** Mọi nước đi được `game-server` kiểm tra bằng `chess-core`. Client không bao giờ là bên quyết định kết quả.
2. **Service không đọc DB của nhau.** Cần dữ liệu thì gọi REST hoặc nghe sự kiện Kafka rồi tự lưu bản sao.
3. **Mọi dữ liệu đi qua mạng** (REST, Socket.IO, Kafka) phải được định nghĩa trong `packages/contracts`. Sự kiện có `version`; đổi kiểu không tương thích thì tạo version mới.
4. **Phát sự kiện qua Transactional Outbox**, không publish Kafka trực tiếp trong request handler.
5. **Consumer phải idempotent** (ghi nhận `eventId` đã xử lý). Lỗi quá số lần retry thì chuyển vào topic `*.dlq`.
6. **Partition key** của sự kiện ván cờ là `gameId`; sự kiện người chơi là `userId`.
7. **Đồng hồ cờ** tính theo thời gian server.
8. Mọi thay đổi logic đều có test. `chess-core` và `messaging` phải giữ coverage cao.

## Quy ước

- Ngôn ngữ: TypeScript (strict) ở mọi nơi.
- Commit: Conventional Commits, tiếng Anh.
- Tài liệu dự án: tiếng Việt. Code, tên biến, comment: tiếng Anh.
- Branch: `feat/...`, `fix/...`, `chore/...`; mọi thay đổi vào `main` qua PR với CI xanh.

## Lệnh thường dùng

> Sẽ cập nhật khi scaffold xong (giai đoạn 1).
