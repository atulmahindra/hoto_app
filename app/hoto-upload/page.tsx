"use client";

import Link from "next/link";
import HotoUpload from "../components/HotoUpload";

export default function HotoUploadPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-10">
      <nav className="mx-auto mb-4 flex max-w-[1360px] gap-4">
        <Link
          href="/"
          className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          HOTO Audit
        </Link>
        <Link
          href="/hoto-upload"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Manual Upload
        </Link>
      </nav>
      <div className="appdiv">
        <HotoUpload />
      </div>
    </main>
  );
}
