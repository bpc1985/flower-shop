import Link from "next/link";
import { OCCASIONS } from "@/lib/occasion-calendar";

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <h1 className="font-heading text-6xl text-warm-900 mb-4">404</h1>
      <p className="text-warm-800/60 mb-8">Trang không tồn tại hoặc đã bị xoá.</p>
      <div className="max-w-md mx-auto">
        <h2 className="font-heading text-lg text-warm-900 mb-4">Mua hoa theo dịp:</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {OCCASIONS.map((o) => (
            <Link
              key={o.slug}
              href={`/occasions/${o.slug}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-200 transition-colors text-sm"
            >
              <span>{o.emoji}</span>
              <span>{o.name_vi}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
