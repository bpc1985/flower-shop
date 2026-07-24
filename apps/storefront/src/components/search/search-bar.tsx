"use client";

import { Search, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { medusaClient } from "@/lib/medusa-client";

export function SearchBar() {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ponytail: inline debounce, no separate hook
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const {
    data: products,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      const { products } = await medusaClient.store.product.list({
        q: debouncedQuery,
        fields: "title,handle,thumbnail",
        limit: 5,
      });
      return products ?? [];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      setQuery("");
    }, 200);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
  };

  const handleResultClick = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setOpen(false);
    setQuery("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-2 hover:text-burgundy-600 transition-colors hidden sm:block"
        title={t("nav.search")}
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="relative">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={t("search.placeholder")}
        className="border border-cream-200 rounded-lg px-3 py-1.5 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-500 w-64"
      />

      {debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-cream-200 rounded-lg shadow-elevated overflow-hidden z-50">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-sage-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("search.searching")}
            </div>
          )}
          {isError && (
            <div className="px-3 py-2 text-sm text-red-500">
              {t("search.error")}
            </div>
          )}
          {!isLoading && !isError && products && products.length === 0 && (
            <div className="px-3 py-2 text-sm text-warm-500">
              {t("search.noResults")}
            </div>
          )}
          {!isLoading && !isError && products && products.length > 0 && (
            <ul>
              {products.map((product: any) => (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.handle}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-cream-50 transition-colors"
                    onClick={handleResultClick}
                    // ponytail: onMouseDown fires before blur, catches the click
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="relative w-10 h-10 rounded-md overflow-hidden bg-cream-200 flex-shrink-0">
                      {product.thumbnail ? (
                        <Image
                          src={product.thumbnail}
                          alt={product.title ?? ""}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-warm-400">
                          <Search className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-warm-900 line-clamp-1">
                      {product.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
