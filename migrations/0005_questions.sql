-- Story 2.4 / Migration 0005_questions
-- Purpose: Create the questions table for the CAT (Computer Adaptive Testing) engine
--   and seed it with 16 situational questions in Vietnamese (4 per MBTI dimension).
-- Satisfies: AC-2, AC-3 of Story 2.4
-- Aligns with: packages/shared/src/db/rows.ts (QuestionRow as of Story 2.4)
--   apps/api/src/lib/cat.ts (selectNextQuestion, calculateMBTIType)

CREATE TABLE questions (
  id             TEXT PRIMARY KEY NOT NULL,
  text           TEXT NOT NULL,
  dimension      TEXT NOT NULL CHECK (dimension IN ('E_I', 'S_N', 'T_F', 'J_P')),
  answer_options TEXT NOT NULL, -- JSON: [{label: string, value: number}]
  discrimination REAL NOT NULL DEFAULT 1.0,
  difficulty     REAL NOT NULL DEFAULT 0.0,
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_questions_dimension_active ON questions(dimension, is_active);

-- ======================================================================
-- Seed data — 16 questions (4 per dimension)
-- value 1 = first pole (E, S, T, J); value 2 = second pole (I, N, F, P)
-- ======================================================================

-- E_I dimension (Extraversion vs Introversion)
INSERT INTO questions (id, text, dimension, answer_options, discrimination) VALUES
('q-ei-01', 'Sau một ngày làm việc mệt mỏi, bạn thích làm gì nhất?',
 'E_I', '[{"label":"Gặp gỡ bạn bè, ra ngoài xã giao","value":1},{"label":"Ở nhà một mình, nạp lại năng lượng","value":2}]', 1.4),
('q-ei-02', 'Khi gặp người lạ trong một buổi tiệc, bạn thường:',
 'E_I', '[{"label":"Chủ động làm quen và trò chuyện trước","value":1},{"label":"Chờ người khác lên tiếng trước hoặc ở lại một góc quen thuộc","value":2}]', 1.2),
('q-ei-03', 'Khi cần giải quyết một vấn đề khó, bạn nghiêng về phía nào hơn?',
 'E_I', '[{"label":"Bàn luận với người khác — nói ra giúp tôi hiểu rõ hơn","value":1},{"label":"Suy nghĩ một mình trước khi chia sẻ với ai","value":2}]', 1.3),
('q-ei-04', 'Trong một cuộc họp nhóm, bạn thường:',
 'E_I', '[{"label":"Chia sẻ ý kiến ngay lập tức khi có ý tưởng","value":1},{"label":"Quan sát và chỉ phát biểu khi suy nghĩ đã chín muồi","value":2}]', 1.1);

-- S_N dimension (Sensing vs Intuition)
INSERT INTO questions (id, text, dimension, answer_options, discrimination) VALUES
('q-sn-01', 'Khi học một kỹ năng mới, bạn thích cách nào hơn?',
 'S_N', '[{"label":"Thực hành từng bước cụ thể, làm quen với chi tiết","value":1},{"label":"Nắm bức tranh tổng thể trước, sau đó tự điền chi tiết","value":2}]', 1.3),
('q-sn-02', 'Bạn tin vào điều gì hơn khi đưa ra quyết định?',
 'S_N', '[{"label":"Kinh nghiệm thực tế và dữ liệu cụ thể","value":1},{"label":"Linh cảm và các xu hướng tôi nhận ra theo thời gian","value":2}]', 1.4),
('q-sn-03', 'Khi đọc hướng dẫn sử dụng, bạn thường:',
 'S_N', '[{"label":"Đọc từng bước một theo thứ tự","value":1},{"label":"Lướt qua để hiểu ý tổng thể, rồi tự thử","value":2}]', 1.2),
('q-sn-04', 'Bạn thích nói chuyện về chủ đề nào hơn?',
 'S_N', '[{"label":"Những sự kiện và thực tế đang xảy ra trong cuộc sống","value":1},{"label":"Ý tưởng, khả năng và những điều có thể xảy ra trong tương lai","value":2}]', 1.1);

-- T_F dimension (Thinking vs Feeling)
INSERT INTO questions (id, text, dimension, answer_options, discrimination) VALUES
('q-tf-01', 'Khi bạn bè nhờ lời khuyên về quyết định quan trọng, bạn thường:',
 'T_F', '[{"label":"Phân tích ưu/nhược điểm và chỉ ra lựa chọn hợp lý nhất","value":1},{"label":"Lắng nghe cảm xúc của họ và hỏi điều gì quan trọng nhất với họ","value":2}]', 1.4),
('q-tf-02', 'Khi xem xét một chính sách mới tại nơi làm việc, điều bạn hỏi đầu tiên là:',
 'T_F', '[{"label":"Chính sách này có hiệu quả và công bằng về mặt logic không?","value":1},{"label":"Chính sách này ảnh hưởng thế nào đến cảm xúc và tinh thần của mọi người?","value":2}]', 1.3),
('q-tf-03', 'Khi đưa ra phản hồi cho ai đó, bạn ưu tiên:',
 'T_F', '[{"label":"Trung thực và thẳng thắn — dù có thể khó nghe","value":1},{"label":"Khéo léo và ân cần — đảm bảo họ không bị tổn thương","value":2}]', 1.2),
('q-tf-04', 'Sau một cuộc tranh luận, bạn cảm thấy hài lòng khi:',
 'T_F', '[{"label":"Vấn đề được giải quyết dứt khoát, dù không ai vui lắm","value":1},{"label":"Mọi người vẫn cảm thấy thoải mái với nhau dù chưa đi đến kết luận cuối","value":2}]', 1.1);

-- J_P dimension (Judging vs Perceiving)
INSERT INTO questions (id, text, dimension, answer_options, discrimination) VALUES
('q-jp-01', 'Cuối tuần lý tưởng của bạn là:',
 'J_P', '[{"label":"Có lịch trình rõ ràng từ trước — biết mình sẽ làm gì","value":1},{"label":"Để mọi thứ tự nhiên diễn ra — linh hoạt theo tâm trạng","value":2}]', 1.3),
('q-jp-02', 'Khi làm một dự án dài hạn, bạn thường:',
 'J_P', '[{"label":"Lập kế hoạch chi tiết và theo sát tiến độ","value":1},{"label":"Làm đến đâu thấy đến đó, thích nghi khi cần thiết","value":2}]', 1.4),
('q-jp-03', 'Không gian làm việc của bạn thường như thế nào?',
 'J_P', '[{"label":"Gọn gàng và có tổ chức — mọi thứ đều có chỗ của nó","value":1},{"label":"Có vẻ lộn xộn với người ngoài nhưng tôi biết mọi thứ ở đâu","value":2}]', 1.2),
('q-jp-04', 'Khi có deadline đang đến gần, bạn thường:',
 'J_P', '[{"label":"Đã hoàn thành sớm — không thích áp lực phút chót","value":1},{"label":"Làm việc hiệu quả nhất dưới áp lực — deadline kích hoạt tôi","value":2}]', 1.1);
