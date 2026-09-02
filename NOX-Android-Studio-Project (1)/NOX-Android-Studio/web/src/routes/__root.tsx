import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          className:
            "!bg-surface !text-fg !border-0 !shadow-[var(--shadow-border)]",
        }}
      />
    </>
  ),
});
