export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/5] rounded-xl bg-cream-200" />
            <div className="h-4 w-3/4 bg-cream-200 rounded" />
            <div className="h-3 w-1/2 bg-cream-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
