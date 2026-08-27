"use client";

import HotoAuditTable from "./components/HotoAuditTable";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-10">
      <div className="appdiv">
        <HotoAuditTable />
      </div>
    </main>
  );
}
