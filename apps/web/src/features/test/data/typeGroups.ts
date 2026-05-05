import { MBTI_TYPES, type MBTIType } from '@mbti/shared';

export type GroupKey = 'analysts' | 'diplomats' | 'sentinels' | 'explorers';

export type TypeGroup = {
  key: GroupKey;
  name: string;
  descriptor: string;
  types: ReadonlyArray<MBTIType>;
};

export type TypeMeta = {
  code: MBTIType;
  vietnameseName: string;
  recognition: string;
};

export const TYPE_GROUPS: ReadonlyArray<TypeGroup> = [
  { key: 'analysts',  name: 'Người tư duy',       descriptor: 'Phân tích, logic, chiến lược',     types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  { key: 'diplomats', name: 'Người đồng cảm',     descriptor: 'Giá trị, kết nối, ý nghĩa',        types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  { key: 'sentinels', name: 'Người thực tế',      descriptor: 'Trách nhiệm, trật tự, đáng tin',   types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  { key: 'explorers', name: 'Người trải nghiệm',  descriptor: 'Tự do, linh hoạt, hành động',      types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
];

export const TYPE_META: Readonly<Record<MBTIType, TypeMeta>> = {
  INTJ: { code: 'INTJ', vietnameseName: 'Chiến lược gia',        recognition: 'Luôn có kế hoạch dài hạn trong đầu' },
  INTP: { code: 'INTP', vietnameseName: 'Nhà tư duy',            recognition: 'Thích phân tích mọi thứ đến tận gốc rễ' },
  ENTJ: { code: 'ENTJ', vietnameseName: 'Người lãnh đạo',        recognition: 'Nhìn thấy đích đến rõ hơn cả nhóm' },
  ENTP: { code: 'ENTP', vietnameseName: 'Người tranh biện',      recognition: 'Thích lật ngược vấn đề để tìm góc nhìn mới' },
  INFJ: { code: 'INFJ', vietnameseName: 'Người tiên tri',        recognition: 'Hiểu người khác sâu hơn họ hiểu bản thân' },
  INFP: { code: 'INFP', vietnameseName: 'Người mộng mơ',         recognition: 'Sống theo giá trị cá nhân, không theo quy tắc' },
  ENFJ: { code: 'ENFJ', vietnameseName: 'Người truyền cảm hứng', recognition: 'Kéo mọi người về phía tốt hơn một cách tự nhiên' },
  ENFP: { code: 'ENFP', vietnameseName: 'Người nhiệt huyết',     recognition: 'Có ý tưởng cho mọi thứ — và không bao giờ hết' },
  ISTJ: { code: 'ISTJ', vietnameseName: 'Người gìn giữ',         recognition: 'Làm đúng, làm chắc — không cần ai nhắc' },
  ISFJ: { code: 'ISFJ', vietnameseName: 'Người bảo hộ',          recognition: 'Nhớ hết điều quan trọng với người mình thương' },
  ESTJ: { code: 'ESTJ', vietnameseName: 'Người tổ chức',         recognition: 'Ai cần quản lý dự án hoặc sự kiện thì tìm họ' },
  ESFJ: { code: 'ESFJ', vietnameseName: 'Người chăm sóc',        recognition: 'Hạnh phúc nhất khi mọi người xung quanh đều ổn' },
  ISTP: { code: 'ISTP', vietnameseName: 'Người thực chiến',      recognition: 'Học nhanh nhất khi tự tay làm — không cần hướng dẫn' },
  ISFP: { code: 'ISFP', vietnameseName: 'Người nghệ sĩ',         recognition: 'Cảm nhận nhiều, nói ít — nhưng làm đẹp mọi thứ' },
  ESTP: { code: 'ESTP', vietnameseName: 'Người hành động',       recognition: 'Không thích kế hoạch dài, thích bắt tay làm ngay' },
  ESFP: { code: 'ESFP', vietnameseName: 'Người vui sống',        recognition: 'Ở đâu có họ, ở đó có năng lượng và tiếng cười' },
};

// Module-load invariant: every MBTI_TYPES entry must appear in exactly one group,
// and TYPE_META must cover all 16 types. Throws at import time if data drifts.
{
  const grouped = TYPE_GROUPS.flatMap((g) => g.types);
  const groupedSet = new Set(grouped);
  if (grouped.length !== MBTI_TYPES.length) {
    throw new Error(`TYPE_GROUPS: expected ${MBTI_TYPES.length} types, got ${grouped.length}`);
  }
  if (groupedSet.size !== MBTI_TYPES.length) {
    throw new Error('TYPE_GROUPS: contains duplicate types across groups');
  }
  for (const t of MBTI_TYPES) {
    if (!groupedSet.has(t)) throw new Error(`TYPE_GROUPS: missing type ${t}`);
    if (!TYPE_META[t]) throw new Error(`TYPE_META: missing entry for ${t}`);
  }
}
