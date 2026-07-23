"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

// ponytail: UI only, functional search in Phase 7
export function SearchBar() {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="p-2 hover:text-burgundy-600 transition-colors hidden sm:block">
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center">
      <input
        autoFocus
        type="text"
        placeholder={t("nav.search")}
        className="border border-cream-200 rounded-lg px-3 py-1.5 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-500"
        onBlur={() => setOpen(false)}
      />
    </div>
  );
}
