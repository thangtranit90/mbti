export type ProductType = 'couple_pack' | 'gap_report';

export const PRODUCT_CATALOG: Readonly<
  Record<ProductType, { amount: number; currency: string; label: string }>
> = {
  couple_pack: { amount: 79000, currency: 'VND', label: 'Couple Pack' },
  gap_report: { amount: 49000, currency: 'VND', label: 'Gap Report' },
};

export type PerceptionLikertOption = { label: string; value: number };

export type PerceptionQuestion = {
  id: string;
  text: string;
  // 5-point Likert: 1=Hoàn toàn không, 5=Hoàn toàn đồng ý.
  options: ReadonlyArray<PerceptionLikertOption>;
};

const PERCEPTION_LIKERT: ReadonlyArray<PerceptionLikertOption> = [
  { label: 'Hoàn toàn không', value: 1 },
  { label: 'Ít khi', value: 2 },
  { label: 'Đôi khi', value: 3 },
  { label: 'Thường xuyên', value: 4 },
  { label: 'Luôn luôn', value: 5 },
];

// Story 4.2 — 3 perception questions answered by an invitee about the sender.
// Hard-coded (not DB-seeded) for v1; behavior covers decision-making, social
// energy, and conflict response.
export const PERCEPTION_QUESTIONS: ReadonlyArray<PerceptionQuestion> = [
  {
    id: 'p1-decision',
    text: 'Người này thường ra quyết định nhanh và quyết đoán hơn là cân nhắc lâu.',
    options: PERCEPTION_LIKERT,
  },
  {
    id: 'p2-social',
    text: 'Người này thường lấy lại năng lượng bằng cách gặp gỡ nhiều người hơn là ở một mình.',
    options: PERCEPTION_LIKERT,
  },
  {
    id: 'p3-conflict',
    text: 'Khi có xung đột, người này thường nói thẳng vấn đề thay vì né tránh.',
    options: PERCEPTION_LIKERT,
  },
];

export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

export type MBTIType = (typeof MBTI_TYPES)[number];

export const PERSONA_NAMES: Readonly<Record<MBTIType, string>> = {
  INTJ: 'The Quiet Architect',
  INTP: 'The Lone Theorist',
  ENTJ: 'The Iron Vision',
  ENTP: "The Devil's Advocate",
  INFJ: 'The Silent Oracle',
  INFP: 'The Hidden Compass',
  ENFJ: 'The Invisible Conductor',
  ENFP: 'The Boundless Spark',
  ISTJ: 'The Steady Keeper',
  ISFJ: 'The Memory Holder',
  ESTJ: 'The Framework Builder',
  ESFJ: 'The Warm Anchor',
  ISTP: 'The Quiet Mechanic',
  ISFP: 'The Still Water',
  ESTP: 'The Living Edge',
  ESFP: 'The Living Flame',
};

export type VillainEntry = { type: MBTIType; reason: string };

export const VILLAINS_MAP: Readonly<Record<MBTIType, ReadonlyArray<VillainEntry>>> = {
  INTJ: [
    { type: 'ESFP', reason: 'Nhu cầu bộc phát của họ phá vỡ hệ thống dài hạn của bạn trước khi nó có cơ hội hoạt động.' },
    { type: 'ENFP', reason: 'Họ tạo ra sự hứng khởi cho mọi ý tưởng nhưng khó theo đuổi đến cùng — bạn thấy đó là tiềm năng bị lãng phí.' },
    { type: 'ESFJ', reason: 'Họ đề cao sự hòa thuận và truyền thống theo những cách làm chậm lại những thay đổi cơ cấu mà bạn cho là hiển nhiên.' },
  ],
  INTP: [
    { type: 'ESFJ', reason: 'Họ ưu tiên cảm xúc nhóm hơn phân tích logic — khiến việc giải quyết vấn đề cùng nhau trở thành một cuộc đàm phán mà bạn không đăng ký tham gia.' },
    { type: 'ESTJ', reason: 'Sự chắc chắn về các quy trình đã có sẵn khiến họ dễ kháng cự những cách tiếp cận lý thuyết chưa được thử nghiệm.' },
    { type: 'ENFJ', reason: 'Họ đọc được các động lực giữa người với người mà bạn chưa nắm bắt — và đôi khi dùng điều đó để định hướng cuộc trò chuyện theo cách không minh bạch với bạn.' },
  ],
  ENTJ: [
    { type: 'ISFP', reason: 'Nhịp độ và nhu cầu tự chủ của họ trông như sự kháng cự khi bạn đang cố kéo cả nhóm tiến lên nhanh.' },
    { type: 'INFP', reason: 'Họ có những giá trị cốt lõi thường xung đột với sự cần thiết về mặt chiến lược — và không chịu nhượng bộ theo cách bạn cho là thực dụng.' },
    { type: 'ESFP', reason: 'Họ mang lại năng lượng nhưng không mang lại cấu trúc — điều có thể phá vỡ một kế hoạch đúng lúc cần kỷ luật thực thi.' },
  ],
  ENTP: [
    { type: 'ISFJ', reason: 'Sự trung thành với các quy trình đã thiết lập của họ trở thành rào cản khi bạn đang cố thử xem liệu những quy trình đó có thực sự là tốt nhất không.' },
    { type: 'ISTJ', reason: 'Họ muốn làm đúng như cách đã được chứng minh. Bạn muốn biết liệu cách đó có thực sự là tốt nhất không. Điều này hiếm khi kết thúc nhanh.' },
    { type: 'ESFJ', reason: 'Họ không thoải mái với kiểu thách thức trực tiếp mà bạn dùng để kiểm tra ý tưởng — khiến tranh luận hiệu quả trở nên rủi ro khi có mặt họ.' },
  ],
  INFJ: [
    { type: 'ESTP', reason: 'Họ hành động nhanh dựa trên dữ liệu nhìn thấy được — điều này bỏ qua các kiểu mẫu sâu hơn mà bạn đang theo dõi, khiến bạn cảm thấy cuộc trò chuyện diễn ra ở tầng quá nông.' },
    { type: 'ESTJ', reason: 'Trọng tâm vào cấu trúc đã có thể bác bỏ những lo ngại về tầm nhìn dài hạn trước khi chúng được xem xét đầy đủ.' },
    { type: 'ENTP', reason: 'Họ tranh luận về mọi thứ, kể cả những điều đối với bạn đã được giải quyết — điều này có thể khơi lại những vết thương mà bạn đã sẵn sàng buông bỏ.' },
  ],
  INFP: [
    { type: 'ESTJ', reason: 'Sự ưu tiên hệ thống khách quan hơn giá trị cá nhân khiến bạn cảm thấy vô hình trong các cấu trúc họ thiết kế.' },
    { type: 'ENTJ', reason: 'Cách tiếp cận đặt hiệu quả lên hàng đầu của họ có thể xem giá trị của bạn là những điểm kém hiệu quả cần được tối ưu hóa.' },
    { type: 'ESTP', reason: 'Họ hành động trước, suy nghĩ sau — điều này có thể đưa những việc quan trọng vào chuyển động trước khi các hàm ý đạo đức được cân nhắc.' },
  ],
  ENFJ: [
    { type: 'ISTP', reason: 'Sự ưu tiên sự độc lập và giao tiếp tối thiểu của họ trông như sự từ chối kết nối mà bạn đang cố xây dựng.' },
    { type: 'INTP', reason: 'Họ đánh giá trí tuệ cảm xúc của bạn qua bộ lọc logic — điều này khiến bạn cảm thấy công cụ tốt nhất của mình đang bị bác bỏ.' },
    { type: 'ESTP', reason: 'Họ di chuyển qua con người và tình huống theo tốc độ không để lại chỗ cho mối quan hệ sâu hơn mà bạn đang cố tạo dựng.' },
  ],
  ENFP: [
    { type: 'ISTJ', reason: 'Sự gắn bó với các phương pháp đã được chứng minh trở thành trần giới hạn những gì có thể, khi bạn tin chắc có một cách tốt hơn.' },
    { type: 'ISFJ', reason: 'Sự thận trọng và ưa thích các chuẩn mực đã thiết lập khiến năng lượng của bạn trở nên quá mức hoặc gây bất ổn — và ngược lại.' },
    { type: 'INTJ', reason: 'Họ coi sự hứng khởi của bạn là tiếng ồn cho đến khi bạn chứng minh được ý tưởng hoạt động — điều này khiến sự hợp tác cảm thấy như một cuộc thử nghiệm liên tục.' },
  ],
  ISTJ: [
    { type: 'ENFP', reason: 'Những thay đổi đột ngột trong kế hoạch đã thỏa thuận của họ làm xáo trộn cấu trúc đáng tin cậy mà bạn đã mất thời gian xây dựng.' },
    { type: 'ENTP', reason: 'Họ sẽ tranh luận về ưu điểm của một kế hoạch mà bạn đã cam kết thực hiện — điều này tạo ra sự ma sát không cần thiết khi việc thực thi đã bắt đầu.' },
    { type: 'INFP', reason: 'Những quyết định dựa trên giá trị cá nhân thay vì các quy trình đã thiết lập có thể làm cho việc phối hợp nhóm trở nên khó khăn hơn.' },
  ],
  ISFJ: [
    { type: 'ENTP', reason: 'Sự liên tục đặt câu hỏi về các hệ thống mà bạn đã tin tưởng trở thành sự bất ổn mang danh đổi mới.' },
    { type: 'ESTP', reason: 'Mức độ chấp nhận rủi ro của họ vượt quá những gì cảm thấy an toàn với bạn — và đôi khi họ kéo người khác về phía rủi ro đó trước khi mọi người sẵn sàng.' },
    { type: 'ENTJ', reason: 'Tốc độ và sự chắc chắn của họ có thể áp đảo cách tiếp cận cẩn thận, đặt mối quan hệ lên hàng đầu — điều giúp bạn làm việc hiệu quả.' },
  ],
  ESTJ: [
    { type: 'INFP', reason: 'Những quyết định bắt nguồn từ giá trị cá nhân hơn dữ liệu khách quan có thể gây khó khăn cho sự hợp tác có cấu trúc.' },
    { type: 'ENFP', reason: 'Sự hứng khởi về những hướng đi mới có thể làm gián đoạn các quy trình đáng tin cậy giúp mọi thứ vận hành trơn tru.' },
    { type: 'INTP', reason: 'Cách tiếp cận lý thuyết của họ hiếm khi chuyển thành các bước hành động cụ thể trong khung thời gian bạn đang làm việc.' },
  ],
  ESFJ: [
    { type: 'INTP', reason: 'Sự phân tích logic của họ có thể tỏ ra coi thường các động lực giữa con người mà bạn đang quản lý cẩn thận.' },
    { type: 'INTJ', reason: 'Sự ưu tiên hiệu quả hơn sự hòa thuận có thể làm tổn hại các mối quan hệ mà bạn đã dành thời gian duy trì.' },
    { type: 'ENTP', reason: 'Thói quen thách thức những gì đang hoạt động tốt của họ có thể gieo mầm nghi ngờ ở nơi bạn đã xây dựng được niềm tin.' },
  ],
  ISTP: [
    { type: 'ENFJ', reason: 'Nhu cầu có sự đồng thuận cảm xúc trong mọi tương tác của họ tạo ra áp lực thể hiện những cảm xúc mà bạn đơn giản là không có.' },
    { type: 'ESFJ', reason: 'Họ đọc sự im lặng độc lập của bạn là khoảng cách hoặc không tán thành — và phản ứng theo những cách tạo ra sự khó chịu mà chính họ đang cố tránh.' },
    { type: 'ENFP', reason: 'Cường độ cảm xúc và nhu cầu nhiệt tình chung của họ trở thành một cam kết mà bạn không thể thực sự thực hiện.' },
  ],
  ISFP: [
    { type: 'ENTJ', reason: 'Tốc độ và sự thẳng thắn của họ có thể lướt qua những điều bạn cần thời gian để xử lý.' },
    { type: 'ESTJ', reason: 'Sự tự tin vào hệ thống và quy tắc của họ có thể bác bỏ những sắc thái cá nhân quan trọng nhất với bạn.' },
    { type: 'INTJ', reason: 'Sự chắc chắn về câu trả lời đúng đắn của họ có thể đóng cửa sự khám phá mà bạn cần để tự tìm ra con đường của mình.' },
  ],
  ESTP: [
    { type: 'INFJ', reason: 'Những lo ngại trực giác về hướng đi của một việc gì đó trở thành lực kéo phanh đúng lúc bạn đang bắt đà.' },
    { type: 'INFP', reason: 'Nhu cầu căn chỉnh hành động với giá trị của họ có thể làm chậm những quyết định trông rõ ràng với bạn.' },
    { type: 'INTJ', reason: 'Tư duy dài hạn của họ có thể trở thành sự kỹ lưỡng thái quá với người ưa thích thích nghi khi mọi thứ diễn ra.' },
  ],
  ESFP: [
    { type: 'INTJ', reason: 'Thế giới nội tâm của họ đã được trang bị đầy đủ — và họ không luôn tìm kiếm bạn đồng hành trong đó. Điều đó có thể cảm thấy như sự loại trừ.' },
    { type: 'INTP', reason: 'Sự ưu tiên phân tích hơn trải nghiệm chung của họ khiến sự kết nối trở nên như một công việc.' },
    { type: 'INFJ', reason: 'Sự hiện diện có chọn lọc và cường độ âm thầm của họ trở thành một cánh cửa gần như — nhưng không hoàn toàn — mở.' },
  ],
};

// Module-load runtime invariant — guards Story 3.1 copy edits from breaking
// the 3-villains-per-row contract that downstream UI assumes.
for (const t of MBTI_TYPES) {
  const row = VILLAINS_MAP[t];
  if (row.length !== 3) {
    throw new Error(`VILLAINS_MAP[${t}]: expected 3 entries, got ${row.length}`);
  }
  if (new Set(row.map((v) => v.type)).size !== 3) {
    throw new Error(`VILLAINS_MAP[${t}]: contains duplicate friction types`);
  }
  if (row.some((v) => v.type === t)) {
    throw new Error(`VILLAINS_MAP[${t}]: cannot include self as a friction type`);
  }
}
