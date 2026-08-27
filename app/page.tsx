"use client";

import Datepicker, { DateRangeType } from "react-advance-datepicker";
import { useState } from "react";

export default function Home() {
  const [value, setValue] = useState<DateRangeType>({
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 6)),
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-slate-900">
          Welcome to the date range picker
        </h1>

        <div className="rounded-2xl bg-white p-1 shadow-sm sm:p-2">
          <Datepicker
            value={value}
            onChange={(nextValue) => nextValue && setValue(nextValue)}
            useRange
            showShortcuts
            showFooter
            primaryColor="blue"
            displayFormat="YYYY-MM-DD"
            separator="~"
            placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
            startFrom={new Date()}
            popoverDirection="down"
            inputClassName="h-16 w-full border-0 text-lg text-slate-500 outline-none focus:ring-0"
          />
        </div>
      </section>
    </main>
  );
}
