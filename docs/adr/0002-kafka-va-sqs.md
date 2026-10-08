# 0002. Kafka làm event bus, SQS cho tác vụ nặng

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-08

## Bối cảnh
Khi một ván kết thúc, nhiều việc độc lập cần xảy ra: tính ELO, cập nhật bảng xếp hạng, thành tựu, thống kê, sinh PGN/replay/ảnh chia sẻ. Gọi đồng bộ từ `game-server` tới từng service sẽ làm `game-server` phụ thuộc vào tất cả và chậm theo service chậm nhất. Hai loại công việc có đặc điểm khác nhau:
- **Sự kiện** ("điều gì đã xảy ra"): nhiều consumer cùng quan tâm, cần đúng thứ tự theo ván/người chơi, muốn đọc lại được.
- **Tác vụ nặng chạy một lần** (render ảnh, sinh file): cần retry, DLQ, tự scale, không cần nhiều consumer.

## Quyết định
- **Kafka** (Redpanda khi chạy local) làm event bus. Topic `game.events`, `player.events`, `rating.events`, kèm `*.dlq`. Giữ sự kiện 7 ngày.
- Partition key: `gameId` cho sự kiện ván, `userId` cho sự kiện người chơi, để cùng key được xử lý đúng thứ tự.
- **SQS → Lambda** cho tác vụ nặng. Một bridge nghe `game.finished` rồi đẩy job vào SQS `replay-jobs` (có DLQ).

## Các phương án đã cân nhắc
- **Chỉ RabbitMQ:** hợp với hàng đợi tác vụ nhưng không giữ lịch sử để replay; fan-out cho nhiều consumer kém tự nhiên hơn consumer group của Kafka.
- **Chỉ SQS/SNS:** đơn giản, nhưng không đảm bảo thứ tự theo key (trừ FIFO, có giới hạn throughput) và không đọc lại được.
- **Redis Streams:** nhẹ, nhưng độ bền và hệ sinh thái kém hơn Kafka; ít giá trị thể hiện cho portfolio.
- **Chỉ Kafka, xử lý tác vụ nặng bằng worker:** được, nhưng mất phần thể hiện Lambda/SQS và cơ chế tự scale theo hàng đợi.

## Hệ quả
- Tốt: service tách rời; `scores` sập thì ván vẫn chơi được, ELO cập nhật khi phục hồi.
- Tốt: thêm consumer mới (ví dụ analytics) không cần sửa producer; đọc lại sự kiện để dựng lại dữ liệu.
- Đánh đổi: thêm hạ tầng phải vận hành; dữ liệu nhất quán sau (eventual consistency), ví dụ ELO hiện trễ một nhịp sau khi ván kết thúc.
- Đánh đổi: cần outbox, idempotent consumer, DLQ và quản lý version schema (ADR 0004).
