export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatVNDRange(min: number, max: number): string {
  if (min === max) return formatVND(min);
  return `${formatVND(min)} — ${formatVND(max)}`;
}
