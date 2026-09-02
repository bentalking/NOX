import { createHashHistory, createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

const hashHistory = createHashHistory();

export function getRouter() {
  return createRouter({
    routeTree,
    history: hashHistory,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: () => (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
        <h1 className="font-heading text-lg font-semibold">Seite nicht gefunden</h1>
        <p className="text-sm text-muted">Die Route existiert nicht.</p>
      </main>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
