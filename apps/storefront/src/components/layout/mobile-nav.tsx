"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { OCCASIONS } from "@/lib/occasion-calendar";
import { LanguageSwitcher } from "./language-switcher";

export function MobileNav() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="md:hidden p-2">
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] bg-cream-100 border-cream-200">
        <nav className="flex flex-col gap-6 mt-8">
          <LanguageSwitcher onSelect={() => setOpen(false)} />

          <div>
            <h4 className="font-heading text-lg text-burgundy-600 mb-3">
              {locale === "vi" ? "Dịp" : "Occasions"}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {OCCASIONS.map((o) => (
                <Link
                  key={o.slug}
                  href={`/occasions/${o.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-sm py-1.5"
                >
                  <span>{o.emoji}</span>{" "}
                  {locale === "vi" ? o.name_vi : o.name_en}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
