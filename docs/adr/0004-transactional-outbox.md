# 0004. Transactional Outbox + idempotent consumer

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-08

## Bối cảnh
Khi ván kết thúc, `game-server` phải vừa lưu kết quả vào Postgres vừa phát `game.finished` lên Kafka. Hai thao tác này không nằm trong cùng một transaction:
- ghi DB xong mà publish lỗi thì mất sự kiện (không ai tính ELO);
- publish xong mà ghi DB lỗi thì có sự kiện cho một ván không tồn tại.
Phía consumer, Kafka đảm bảo giao **ít nhất một lần**, nên cùng một sự kiện có thể tới nhiều lần (retry, rebalance).

## Quyết định
- **Outbox:** ghi dữ liệu nghiệp vụ và một dòng vào bảng `outbox` trong **cùng một transaction**. Một outbox relay đọc các dòng chưa publish, đẩy lên Kafka rồi đặt `published_at`. Không publish Kafka trực tiếp trong request handler.
- **Idempotent consumer:** mỗi consumer ghi `(event_id, consumer)` vào `processed_events` trong cùng transaction với thay đổi dữ liệu; gặp `event_id` đã có thì bỏ qua.
- **Retry + DLQ:** retry 3 lần có backoff, sau đó chuyển vào `<topic>.dlq` và cảnh báo.
- Đóng gói trong `packages/messaging` để mọi service dùng cùng một cách.

## Các phương án đã cân nhắc
- **Publish trực tiếp sau khi commit:** đơn giản nhưng mất sự kiện khi tiến trình chết giữa commit và publish.
- **CDC (Debezium đọc WAL Postgres):** không cần relay tự viết, nhưng thêm Kafka Connect và Debezium vào hạ tầng; nặng cho dự án một người.
- **Kafka transactions / exactly-once:** chỉ đảm bảo trong phạm vi Kafka, không bao trùm transaction Postgres.

## Hệ quả
- Tốt: không mất sự kiện khi Kafka tạm thời sập; ván vẫn kết thúc bình thường.
- Tốt: xử lý trùng an toàn; có thể replay topic để dựng lại dữ liệu.
- Đánh đổi: sự kiện tới trễ thêm một nhịp poll của relay; bảng `outbox` cần dọn định kỳ.
- Đánh đổi: relay chạy nhiều bản cần khóa (`SELECT ... FOR UPDATE SKIP LOCKED`) để không publish trùng (consumer vẫn idempotent nên trùng cũng không sai).
