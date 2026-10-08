# Architecture Decision Records

Mỗi file ghi lại một quyết định kỹ thuật quan trọng: bối cảnh, quyết định, các phương án đã cân nhắc và hệ quả.
Không sửa nội dung ADR đã chấp nhận; khi đổi ý thì viết ADR mới và đánh dấu ADR cũ là "Bị thay thế bởi 000X".

| Số | Tiêu đề | Trạng thái |
|---|---|---|
| [0001](0001-monorepo-typescript.md) | Monorepo + TypeScript toàn bộ | Đã chấp nhận |
| [0002](0002-kafka-va-sqs.md) | Kafka làm event bus, SQS cho tác vụ nặng | Đã chấp nhận |
| [0003](0003-game-server-stateful.md) | `game-server` stateful, snapshot vào Redis | Đã chấp nhận |
| [0004](0004-transactional-outbox.md) | Transactional Outbox + idempotent consumer | Đã chấp nhận |
