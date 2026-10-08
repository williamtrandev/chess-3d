# PROGRESS: Tiến độ thực hiện chess3d

> Cập nhật sau mỗi phiên làm việc. Mục mới nhất ở trên cùng.

## Trạng thái hiện tại

| Mục | Giá trị |
|---|---|
| Giai đoạn | 1: Nền móng + chơi với máy |
| Đang làm | Branch `chore/scaffold-monorepo`: scaffold + `chess-core` + ADR xong |
| Tiếp theo | `packages/contracts` → `apps/web` (Next.js) → bàn cờ 3D |
| Vướng mắc | Repo chưa có remote GitHub (chưa mở PR, CI chưa chạy). Mục 6–9 của `OVERVIEW.md` vẫn là bản nháp |

## Nhật ký

### 2026-10-08
- Cân nhắc chuyển backend sang Go, quyết định giữ TypeScript (ghi trong ADR 0001).
- Viết ADR 0001–0004 trong `docs/adr/`.
- Scaffold monorepo: pnpm 11 workspaces, Turborepo, `@chess3d/tsconfig`, `@chess3d/eslint-config` (flat config, typescript-eslint strict), Prettier, Vitest.
- Ghim TypeScript `~6.0.3`: TS 7 (bản Go) chưa được typescript-eslint hỗ trợ (`<6.1.0`).
- Bỏ tsup, build thư viện bằng `tsc` (tsup sinh `baseUrl` bị TS 6 báo deprecated).
- `packages/chess-core`: `ChessGame` (bọc chess.js, kiểm tra lượt, phong cấp, replay từ danh sách nước, PGN), đồng hồ Fischer theo thời gian server, 6 thể thức, kết quả ván (kể cả hết giờ khi đối thủ không đủ quân → hòa). 46 test, coverage 100% dòng.
- CI GitHub Actions: format check, build, lint, typecheck, test.

### 2026-10-07
- Chốt ý tưởng: nền tảng web game chịu tải lớn, game đầu tiên là cờ vua 3D.
- Chốt chế độ chơi: online (khách + tài khoản + ELO) và đánh với máy (Stockfish).
- Chốt công nghệ: TypeScript toàn bộ, monorepo pnpm + Turborepo, Next.js + React Three Fiber, NestJS + Socket.IO.
- Chốt kiến trúc service: `identity`, `game-server` (stateful), `scores`, `catalog`, `workers`, `lambdas`.
- Chốt broker: Kafka (Redpanda khi chạy local) làm event bus + SQS → Lambda cho tác vụ nặng.
- Chốt luồng ván cờ online (matchmaking, server làm trọng tài, đồng hồ server, snapshot Redis, outbox).
- Tạo `CLAUDE.md`, `OVERVIEW.md`, `PLAN.md`, `PROGRESS.md`; khởi tạo git.
