export interface Occasion {
  slug: string;
  name_vi: string;
  name_en: string;
  emoji: string;
  date?: string;
  lunarMonth?: number;
  lunarDay?: number;
  daysBefore: number;
}

export const OCCASIONS: Occasion[] = [
  { slug: "sinh-nhat", name_vi: "Sinh Nhật", name_en: "Birthday", emoji: "🎂", daysBefore: 0 },
  { slug: "ky-niem", name_vi: "Kỷ Niệm", name_en: "Anniversary", emoji: "💝", daysBefore: 0 },
  { slug: "tinh-yeu", name_vi: "Tình Yêu", name_en: "Love & Romance", emoji: "💕", daysBefore: 0 },
  { slug: "chuc-mung", name_vi: "Chúc Mừng", name_en: "Congratulations", emoji: "🎉", daysBefore: 0 },
  { slug: "chia-buon", name_vi: "Chia Buồn", name_en: "Sympathy", emoji: "🕊️", daysBefore: 0 },
  { slug: "cam-on", name_vi: "Cảm Ơn", name_en: "Thank You", emoji: "🙏", daysBefore: 0 },
  { slug: "hoa-tet", name_vi: "Hoa Tết", name_en: "Tet Flowers", emoji: "🧧", daysBefore: 14 },
  { slug: "valentine", name_vi: "Valentine 14/2", name_en: "Valentine's Day", emoji: "💘", date: "2027-02-14", daysBefore: 7 },
  { slug: "ngay-phu-nu", name_vi: "Ngày Phụ Nữ", name_en: "Women's Day", emoji: "🌸", date: "2027-03-08", daysBefore: 5 },
  { slug: "ngay-phu-nu-vn", name_vi: "20/10", name_en: "VN Women's Day", emoji: "🌷", date: "2026-10-20", daysBefore: 5 },
];

export function getUpcomingOccasions(): Occasion[] {
  const now = new Date();
  const upcoming: Occasion[] = [];
  for (const o of OCCASIONS) {
    if (!o.date) continue;
    const date = new Date(o.date);
    const daysUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil >= 0 && daysUntil <= o.daysBefore) {
      upcoming.push(o);
    }
  }
  return upcoming;
}
