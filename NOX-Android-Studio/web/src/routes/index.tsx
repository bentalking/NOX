import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import type { TabId } from "@/lib/types";

function parseTab(value: unknown): TabId {
  if (value === "plan" || value === "food" || value === "stats" || value === "home") {
    return value;
  }
  return "home";
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { tab: TabId } => ({
    tab: parseTab(search.tab),
  }),
  component: Home,
});

function Home() {
  const { tab } = Route.useSearch();
  return <AppShell tab={tab} />;
}
