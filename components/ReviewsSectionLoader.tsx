"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Reviews are below the fold and purely client-side (localStorage): skip SSR
// entirely so the page HTML and first-load JS stay light, and show a skeleton
// while the chunk loads on the client. ssr: false is only allowed inside a
// client component, hence this loader wrapper.
const ReviewsSection = dynamic(
  () => import("./ReviewsSection").then((mod) => mod.ReviewsSection),
  { ssr: false }
);

function ReviewsSkeleton() {
  return (
    <section className="bg-[#121824] rounded-2xl p-6 md:p-8 border border-[#1c2534] shadow-xl mt-8 lg:col-span-2 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 rounded-lg bg-[#2a3441]" />
        <div className="h-7 w-48 rounded-lg bg-[#2a3441]" />
      </div>
      <div className="bg-[#0a0f1a] rounded-xl p-5 border border-[#2a3441] mb-8 space-y-3">
        <div className="h-4 w-28 rounded bg-[#2a3441]" />
        <div className="h-10 rounded-lg bg-[#1c2534]" />
        <div className="h-24 rounded-lg bg-[#1c2534]" />
        <div className="h-10 w-36 rounded-lg bg-[#2a3441]" />
      </div>
      <div className="space-y-3">
        <div className="h-20 rounded-xl bg-[#0a0f1a] border border-[#2a3441]" />
        <div className="h-20 rounded-xl bg-[#0a0f1a] border border-[#2a3441]" />
      </div>
    </section>
  );
}

export function ReviewsSectionLoader() {
  return (
    <Suspense fallback={<ReviewsSkeleton />}>
      <ReviewsSection />
    </Suspense>
  );
}
