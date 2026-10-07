# PROGRESS: Tiến độ thực hiện chess3d

> Cập nhật sau mỗi phiên làm việc. Mục mới nhất ở trên cùng.

## Trạng thái hiện tại

| Mục | Giá trị |
|---|---|
| Giai đoạn | 0: Thiết kế |
| Đang làm | Duyệt các phần nháp trong `OVERVIEW.md` (mục 6–9) |
| Tiếp theo | Viết ADR → bắt đầu Giai đoạn 1 (scaffold monorepo, `chess-core`, bàn cờ 3D) |
| Vướng mắc | Không có |

## Nhật ký

### 2026-10-07
- Chốt ý tưởng: nền tảng web game chịu tải lớn, game đầu tiên là cờ vua 3D.
- Chốt chế độ chơi: online (khách + tài khoản + ELO) và đánh với máy (Stockfish).
- Chốt công nghệ: TypeScript toàn bộ, monorepo pnpm + Turborepo, Next.js + React Three Fiber, NestJS + Socket.IO.
- Chốt kiến trúc service: `identity`, `game-server` (stateful), `scores`, `catalog`, `workers`, `lambdas`.
- Chốt broker: Kafka (Redpanda khi chạy local) làm event bus + SQS → Lambda cho tác vụ nặng.
- Chốt luồng ván cờ online (matchmaking, server làm trọng tài, đồng hồ server, snapshot Redis, outbox).
- Tạo `CLAUDE.md`, `OVERVIEW.md`, `PLAN.md`, `PROGRESS.md`; khởi tạo git.
