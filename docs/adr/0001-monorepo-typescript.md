# 0001. Monorepo + TypeScript toàn bộ

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-08

## Bối cảnh
Hệ thống gồm frontend (Next.js) và nhiều service backend. Luật cờ phải chạy ở cả hai phía: server làm trọng tài, client hiển thị trước (optimistic) và tô sáng nước đi hợp lệ. Dữ liệu đi qua mạng (REST, Socket.IO, Kafka) cần một định nghĩa chung để client, service và consumer không lệch nhau. Dự án do một người làm, nên chi phí chuyển ngữ cảnh giữa các ngôn ngữ là đáng kể.

## Quyết định
- **TypeScript (strict) ở mọi nơi:** frontend, các service NestJS, workers, lambdas.
- **Monorepo** bằng pnpm workspaces + Turborepo. Mỗi app vẫn build thành Docker image riêng và chạy độc lập.
- Code dùng chung đặt trong `packages/`: `chess-core` (luật cờ), `contracts` (schema Zod), `messaging`, `observability`.

## Các phương án đã cân nhắc
- **Backend bằng Go:** hiệu năng tốt và rất hợp cho `game-server` nhiều kết nối. Không chọn vì:
  - mất `chess-core` dùng chung, phải duy trì hai bản luật cờ (Go và TS) và kiểm tra chúng không lệch nhau;
  - Zod không dùng được cho Go, phải chuyển sang Protobuf/OpenAPI và thêm bước sinh code;
  - Go thiếu thư viện Socket.IO đáng tin cậy, phải tự viết lớp WebSocket, định tuyến giữa pod và kết nối lại.
- **Polyrepo (mỗi service một repo):** tách biệt rõ hơn nhưng chia sẻ `contracts`/`chess-core` phải qua publish package, đổi schema phải phối hợp nhiều repo.

## Hệ quả
- Tốt: dùng chung luật cờ và schema giữa client và server; đổi contract thì typecheck báo lỗi ngay ở mọi nơi dùng nó; một bộ công cụ (Vitest, ESLint, Prettier).
- Tốt: Turborepo chỉ build/test phần bị ảnh hưởng, CI nhanh hơn.
- Đánh đổi: Node.js đơn luồng; `game-server` cần scale ngang sớm hơn so với Go (đã có thiết kế ở ADR 0003).
- Đánh đổi: monorepo dễ vô tình tạo phụ thuộc chéo; quy tắc "service không đọc DB của nhau" và "chỉ chia sẻ qua `packages/`" phải được giữ bằng review và lint.
