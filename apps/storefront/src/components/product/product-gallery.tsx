"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const displayImages = images.length > 0 ? images : ["/placeholder-flower.jpg"];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cream-200 shadow-card">
        <Image
          src={displayImages[selected]}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          unoptimized
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {displayImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
              i === selected ? "border-sage-500" : "border-transparent"
            }`}
          >
            <Image src={img} alt={`${title} ${i + 1}`} fill className="object-cover" sizes="64px" unoptimized />
          </button>
        ))}
      </div>
    </div>
  );
}
