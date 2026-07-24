"use client";

import { Suspense } from "react";
import { FilterSidebar } from "./filter-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function FilterSidebarSuspense() {
  return (
    <Suspense fallback={<div className="space-y-6"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-20 w-full" /></div>}>
      <FilterSidebar />
    </Suspense>
  );
}
