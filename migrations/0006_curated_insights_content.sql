-- Story 3.1 / Migration 0006_curated_insights_content
-- Purpose: Replace placeholder curated insight text with production copy.
-- All rows were seeded in 0002_curated_insights_seed.sql.

UPDATE curated_insights SET content = 'Bạn thường đã hiểu toàn bộ hệ thống trước khi hầu hết mọi người thậm chí đặt tên được vấn đề — nhưng bạn giữ im lặng vì việc giải thích cảm thấy chậm hơn là tự làm.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-INTJ-v1';

UPDATE curated_insights SET content = 'Bạn có thể theo đuổi hầu hết ý tưởng đến kết luận logic của nó — nhưng đôi khi bạn bị mắc kẹt ở đó, không phải vì công việc khó, mà vì một hướng đi hấp dẫn tiếp theo xuất hiện trước khi cái này xong.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-INTP-v1';

UPDATE curated_insights SET content = 'Bạn không chỉ muốn lãnh đạo — bạn cần đội nhóm sắc bén như bạn. Khi ai đó không đạt được, bạn không tức giận; bạn lặng lẽ ngừng dựa vào họ.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ENTJ-v1';

UPDATE curated_insights SET content = 'Bạn thích một cuộc tranh luận hay không phải để thắng, mà để tìm ra lỗ hổng trong lập luận của chính mình trước khi người khác làm. Điều khó nhất là biết khi nào nên dừng lại.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ENTP-v1';

UPDATE curated_insights SET content = 'Bạn thường cảm nhận được kết quả trước khi ai nói lên xung đột — và bạn mang điều đó trong im lặng, chờ đợi thời điểm thích hợp để lên tiếng. Đôi khi thời điểm đó không đến.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-INFJ-v1';

UPDATE curated_insights SET content = 'Bạn có một la bàn nội tâm rất rõ ràng ít khi phù hợp với bản đồ mà mọi người khác đang dùng. Bạn sống với khoảng cách đó, nhưng nó tiêu tốn nhiều năng lượng hơn bạn thừa nhận.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-INFP-v1';

UPDATE curated_insights SET content = 'Bạn đã học cách đọc những gì mọi người cần trước khi họ nói ra. Vấn đề là bạn quá giỏi điều này đến mức mọi người quên mất rằng bạn cũng có nhu cầu — và đôi khi chính bạn cũng quên.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ENFJ-v1';

UPDATE curated_insights SET content = 'Bạn mang lại năng lượng thay đổi nhiệt độ của một căn phòng. Thử thách là bạn cảm nhận mọi thứ ở âm lượng đầy đủ — sự hứng khởi, nhưng cũng cả sự thất vọng khi mọi thứ không đạt đến tầm nhìn.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ENFP-v1';

UPDATE curated_insights SET content = 'Bạn đã làm những điều đáng tin cậy nhiều lần đến mức mọi người đã ngừng nhận ra — điều đó ổn với bạn. Bạn không cần được công nhận. Điều bạn cần là mọi thứ được làm đúng.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ISTJ-v1';

UPDATE curated_insights SET content = 'Bạn nhớ đúng điều gì đó ai đó nhắc đến thoáng qua sáu tháng trước và bạn đã lặng lẽ giữ lấy nó, chờ đợi để làm điều gì đó tử tế với nó. Hầu hết mọi người không biết bạn mang tất cả điều này.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ISFJ-v1';

UPDATE curated_insights SET content = 'Bạn là người lên kế hoạch, chủ trì cuộc họp, và theo dõi vào ngày hôm sau. Điều bạn vẫn đang học là không phải ai cũng xử lý thông tin theo tốc độ của bạn — và đó không phải là sự lười biếng.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ESTJ-v1';

UPDATE curated_insights SET content = 'Bạn thực sự muốn mọi người đều ổn, và bạn đã trở nên rất giỏi trong việc làm cho điều đó xảy ra. Chi phí là bạn đã học cách đặt sự không thoải mái của chính mình vào một nơi ngoài tầm nhìn.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ESFJ-v1';

UPDATE curated_insights SET content = 'Bạn giải quyết vấn đề với chuyển động tối thiểu và độ chính xác tối đa. Bạn hiếm khi giải thích lý luận của mình cho đến khi xong, điều này có thể làm người khác bất an vì họ nhầm sự im lặng với sự thụ động.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ISTP-v1';

UPDATE curated_insights SET content = 'Bạn cảm nhận mọi thứ sâu sắc nhưng thể hiện có chọn lọc. Hầu hết mọi người thấy bề mặt bình lặng và nhầm đó là sự xa cách — họ không thấy thế giới đầy đủ bạn đang quan sát bên dưới.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ISFP-v1';

UPDATE curated_insights SET content = 'Bạn ở trạng thái tốt nhất khi tình huống cấp bách và lộn xộn. Bạn đọc được bầu không khí nhanh hơn hầu hết mọi người đọc tóm tắt — và bạn đã đang di chuyển trước khi cuộc họp kết thúc.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ESTP-v1';

UPDATE curated_insights SET content = 'Bạn mang lại sự ấm áp cho mọi tương tác mà không có ý định — đó không phải là màn trình diễn, đó chỉ là cách bạn vốn vậy. Thử thách là không phải ai cũng biết cách nắm giữ loại năng lượng đó với sự trân trọng.', updated_at = '2026-05-05T00:00:00.000Z' WHERE id = 'placeholder-insight-ESFP-v1';
