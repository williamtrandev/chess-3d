# 0003. `game-server` stateful, snapshot vào Redis

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-08

## Bối cảnh
Mỗi nước đi cần được kiểm tra, trừ đồng hồ và phát cho hai người chơi với độ trễ thấp (mục tiêu p95 < 150ms). Nếu `game-server` stateless, mỗi nước đi phải đọc và ghi toàn bộ trạng thái ván từ kho ngoài, thêm độ trễ và tạo race condition khi hai sự kiện của cùng một ván tới hai pod khác nhau.

## Quyết định
- Mỗi ván được **giữ trong RAM của đúng một pod** `game-server`. Redis lưu `game:{id}:owner` (lease có TTL, pod gia hạn định kỳ).
- Sau mỗi nước đi, ghi **snapshot** (`FEN`, danh sách nước, đồng hồ, `seq`) vào Redis `game:{id}:state`.
- Người chơi kết nối vào pod khác được chuyển tiếp tới pod đang giữ ván qua Socket.IO Redis adapter.
- Pod chết: lease hết hạn, pod khác nhận quyền sở hữu, nạp snapshot và ván chơi tiếp. Deploy: graceful drain.
- Đồng hồ tính theo thời gian server.

## Các phương án đã cân nhắc
- **Stateless, trạng thái hoàn toàn trong Redis:** dễ scale và deploy, nhưng mỗi nước đi cần đọc-sửa-ghi có khóa (Lua/WATCH), độ trễ cao hơn và logic phức tạp hơn.
- **Sticky session ở load balancer:** không đủ, vì hai người chơi của cùng một ván có thể bị gắn vào hai pod khác nhau.
- **Lưu snapshot vào Postgres:** bền hơn nhưng chậm hơn cho mỗi nước đi; Postgres chỉ lưu kết quả cuối ván.

## Hệ quả
- Tốt: xử lý nước đi trong bộ nhớ, độ trễ thấp, không race condition trong một ván.
- Tốt: chịu được pod chết và deploy mà không mất ván.
- Đánh đổi: scale theo số kết nối/ván chứ không theo CPU; HPA và drain phức tạp hơn service stateless.
- Đánh đổi: có khoảng thời gian ngắn (tới khi lease hết hạn) ván bị treo nếu pod chết; snapshot có thể thiếu nước đi cuối nếu pod chết giữa lúc kiểm tra và ghi, nên client cần gửi lại theo `clientSeq`.
