import { Dumbbell, House, UserRound, Utensils } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { FoodView } from "@/components/food-view";
import { PlanView } from "@/components/plan-view";
import { StatsView } from "@/components/stats-view";
import { msUntilMidnight, todayKey, weekdayOf } from "@/lib/date";
import type { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: TabId; label: string; icon: typeof House }[] = [
  { id: "home", label: "Heute", icon: House },
  { id: "plan", label: "Plan", icon: Dumbbell },
  { id: "food", label: "Essen", icon: Utensils },
  { id: "stats", label: "Werte", icon: UserRound },
];

export function AppShell({ tab }: { tab: TabId }) {
  const [date, setDate] = useState(todayKey);

  useEffect(() => {
    const tick = () => setDate(todayKey());
    const interval = window.setInterval(tick, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    const until = window.setTimeout(tick, msUntilMidnight() + 400);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(until);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [date]);

  const weekday = weekdayOf(date);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[32rem] flex-col">
      <main className="flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32">
        {tab === "home" ? <Dashboard date={date} weekday={weekday} /> : null}
        {tab === "plan" ? <PlanView date={date} weekday={weekday} /> : null}
        {tab === "food" ? <FoodView date={date} /> : null}
        {tab === "stats" ? <StatsView date={date} /> : null}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-md">
        <div className="mx-auto grid w-full max-w-[32rem] grid-cols-4 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <Link
                key={t.id}
                to="/"
                search={{ tab: t.id }}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-subtle",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
