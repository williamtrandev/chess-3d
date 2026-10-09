# PROGRESS: Tiến độ thực hiện chess3d

> Cập nhật sau mỗi phiên làm việc. Mục mới nhất ở trên cùng.

## Trạng thái hiện tại

| Mục | Giá trị |
|---|---|
| Giai đoạn | 1: Nền móng + chơi với máy |
| Đang làm | Người chơi 3D, nhân vật từ ảnh, góc camera, 7 khung cảnh (branch `feat/players-and-avatars`, xếp chồng trên `feat/web-scenery` → `feat/web-play-vs-ai` → `chore/scaffold-monorepo`) |
| Tiếp theo | Tạo repo GitHub, mở PR cho 2 branch, CI chạy lần đầu → bắt đầu Giai đoạn 2 |
| Vướng mắc | Repo chưa có remote GitHub (chưa mở PR, CI chưa chạy). Mục 6–9 của `OVERVIEW.md` vẫn là bản nháp |

## Nhật ký

### 2026-10-09 (phiên 2)
- 6 góc camera: Mặc định, Qua vai, Góc ngồi (ngôi thứ nhất), Cạnh bàn, Trên cao, Điện ảnh (tự lượn); phím V để đổi; lưu trong cài đặt.
- Hai nhân vật 3D ngồi ghế hai bên bàn (dựng bằng code, phong cách chibi): thở, quay đầu nhìn nước vừa đi, với tay khi đi quân (IK hai khớp), chống cằm khi tới lượt, ăn mừng khi thắng, cúi đầu khi thua. Stockfish là robot có kính phát sáng. Nhân vật đứng giữa camera và bàn cờ tự mờ (hoặc ẩn ở góc ngồi).
- Hạ mặt đất xuống `GROUND_Y = -5.6` để nhân vật phóng 1.8 lần ngồi vừa ghế, tay đặt đúng mép bàn.
- Trang `/avatar`: tải ảnh toàn thân → MediaPipe Pose (WASM, chạy trong trình duyệt) tìm 33 điểm khớp + mặt nạ người → lấy màu da, tóc, áo, quần, giày (median theo vùng), đoán kiểu tóc, dáng người, cắt khuôn mặt có viền mờ dán lên đầu nhân vật. Chỉnh màu, kiểu tóc, dáng tay; xem trước 3D xoay được với 4 tư thế. Ảnh không rời khỏi máy; chỉ lưu màu và ảnh mặt nhỏ trong localStorage. Model pose tải từ kho chính thức của Google khi dùng lần đầu.
- Thêm 4 khung cảnh: Hoàng hôn, Núi tuyết (núi, thông phủ tuyết, tuyết rơi), Đêm lồng đèn (sao, trăng, lồng đèn có đèn điểm, đom đóm), Vườn anh đào (cây anh đào, cánh hoa rơi, sỏi cào, đèn đá, cổng torii, ao). Tổng 7 khung cảnh.
- Lỗi tìm được khi kiểm tra: đổi `transparent` của material lúc chạy không biên dịch lại shader (three.js ép alpha = 1 cho material đục) nên nhân vật không mờ → bật `needsUpdate` khi đổi; gợn địa hình đồng cỏ làm chân ghế lơ lửng; `useFace` có thể bật với chuỗi không phải ảnh.
- Chưa kiểm tra được: độ chính xác lấy màu với ảnh người thật (không có ảnh mẫu). Đã kiểm tra pipeline AI chạy thật trong trình duyệt (WASM + model + detect) bằng ảnh không có người.

### 2026-10-09
- Giao diện mới: canvas 3D phủ toàn màn hình, panel kính mờ (glassmorphism) nổi bên phải; mobile: khung cảnh phía trên, panel cuộn bên dưới. Font Be Vietnam Pro.
- Khung cảnh 3D chọn được (lưu trong cài đặt):
  - Đồng quê: đồi thoai thoải, ~60.000 ngọn cỏ đung đưa theo gió (InstancedMesh + shader), hoa, cây low-poly, bướm, chim, mây trôi.
  - Bãi biển: đảo cát, mặt nước bằng shader (sóng, bọt ven bờ, lấp lánh), hàng dừa lắc lư, đá, dù che nắng, mòng biển, mây.
  - Phòng tối: như cũ, cho máy yếu.
  - Trời bằng `Sky` của drei; phản chiếu trên quân lấy từ chính bầu trời; sương mù theo khung cảnh; bàn cờ đặt trên bàn gỗ.
- Camera đóng khung bàn cờ vào phần màn hình trống cạnh panel (`setViewOffset`), thấy được chân trời; tự lùi xa trên màn hẹp.
- Tự giảm chất lượng (ít cỏ, tắt bloom, DPR 1) khi `PerformanceMonitor` thấy FPS giảm.
- Panel người chơi hiện quân đã ăn và chênh lệch quân; danh sách nước đi tô nước cuối; đầu hàng có bước xác nhận; hộp kết quả có confetti khi thắng; thanh cài đặt dạng segmented.
- Trang chủ và trang chọn cấp độ dùng khung cảnh 3D làm nền (bàn cờ tự xoay chậm).
- Cài đặt nạp từ localStorage sau khi mount (`skipHydration`) để tránh lệch hydration.
- Rule `react-hooks/immutability` tắt riêng cho thư mục 3D (R3F thay đổi object three.js trong vòng lặp frame theo thiết kế).
- Đã kiểm tra trong trình duyệt: 1100×700, 375×812; khung cảnh đồng quê, bãi biển; bàn 2D trên khung cảnh; ~120 FPS trên máy dev; console không lỗi.

### 2026-10-08 (phiên 2)
- `packages/contracts`: schema Zod 4 cho envelope sự kiện, `game.started|finished|aborted`, `player.registered`, `rating.updated` (v1), registry theo type + version (`parseEvent`), tên topic + DLQ, payload Socket.IO hai chiều kèm type map cho Socket.IO. Enum lấy từ hằng số của `chess-core`.
- `apps/web` (Next.js 16, React 19, Tailwind 4, R3F 9, drei 10, Zustand 5):
  - Trang `/`, `/play/ai` (chọn cấp 1–8, màu quân), `/game/ai?level=&color=`, `/game/local` (hai người một máy).
  - Store ván (Zustand vanilla) bọc `ChessGame`: chọn quân, đi bằng click hoặc kéo thả, phong cấp, đầu hàng, lật bàn.
  - Bàn 3D: quân dựng bằng `LatheGeometry`; mã dựng bằng `ExtrudeGeometry` (không dùng glTF); bóng đổ mềm từ directional light; Lightformer thay HDRI tải ngoài; bloom; tự giảm DPR + tắt hậu kỳ qua `PerformanceMonitor`; camera tự xoay theo màu quân, góc nhìn từ trên; quân di chuyển theo đường cong, quân bị ăn bay khỏi bàn, rung khi chiếu hết.
  - `Board2D` dự phòng (tự dùng khi không có WebGL), có `data-square` và nhãn truy cập cho E2E.
  - Stockfish 19 lite single-threaded (≈1,8 MB, không cần COOP/COEP) trong Web Worker, copy vào `public/engine` khi `dev`/`build`.
  - Âm thanh tổng hợp bằng Web Audio (không cần file); 3 theme (gỗ, cẩm thạch, neon); lưu cài đặt vào localStorage.
- Đã kiểm tra trong trình duyệt: đi quân bằng click và kéo thả trên bàn 3D, máy đáp nước, phong cấp, chiếu hết + hộp kết quả, đổi theme, 2D/3D, nhìn từ trên.
- Test: `chess-core` 46, `contracts` 8, `web` 23 (store, UCI, bàn cờ, nhãn, `Board2D`).

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
