"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = ToastInput & {
  id: string;
};

const EMPTY_TOASTS: ToastRecord[] = [];
const listeners = new Set<() => void>();
const timeouts = new Map<string, number>();
let toasts: ToastRecord[] = [];

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  return EMPTY_TOASTS;
}

function nextToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function dismissToast(id?: string) {
  if (!id) {
    for (const timeout of timeouts.values()) {
      window.clearTimeout(timeout);
    }
    timeouts.clear();
    toasts = [];
    emit();
    return;
  }

  const timeout = timeouts.get(id);
  if (timeout) {
    window.clearTimeout(timeout);
    timeouts.delete(id);
  }

  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function toast(input: ToastInput) {
  const id = nextToastId();
  const record: ToastRecord = {
    id,
    duration: 4000,
    variant: "default",
    ...input,
  };

  toasts = [record, ...toasts].slice(0, 5);
  emit();

  const timeout = window.setTimeout(() => {
    dismissToast(id);
  }, record.duration);
  timeouts.set(id, timeout);

  return id;
}

export function useToast() {
  const items = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    toasts: items,
    toast,
    dismissToast,
  };
}

const toastVariantClass: Record<ToastVariant, string> = {
  default: "border-brand-100 bg-white text-gray-900",
  success: "border-success-200 bg-success-50 text-success-900",
  error: "border-danger-200 bg-danger-50 text-danger-900",
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return <CheckCircle2 className="h-4 w-4 text-success-700" />;
  }

  if (variant === "error") {
    return <TriangleAlert className="h-4 w-4 text-danger-700" />;
  }

  return <Info className="h-4 w-4 text-brand-700" />;
}

export function Toaster() {
  const { toasts: items } = useToast();

  return (
    <ToastPrimitives.Provider swipeDirection="right">
      {items.map((item) => (
        <ToastPrimitives.Root
          key={item.id}
          open
          onOpenChange={(open) => {
            if (!open) {
              dismissToast(item.id);
            }
          }}
          className={cn(
            "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
            toastVariantClass[item.variant ?? "default"],
          )}
        >
          <div className="mt-0.5 shrink-0">
            <ToastIcon variant={item.variant ?? "default"} />
          </div>
          <div className="grid gap-1">
            <ToastPrimitives.Title className="text-sm font-semibold">
              {item.title}
            </ToastPrimitives.Title>
            {item.description ? (
              <ToastPrimitives.Description className="text-sm text-gray-600">
                {item.description}
              </ToastPrimitives.Description>
            ) : null}
          </div>
          <ToastPrimitives.Close
            className="absolute right-2 top-2 rounded-sm p-1 text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900"
            aria-label="Close toast"
          >
            <X className="h-4 w-4" />
          </ToastPrimitives.Close>
        </ToastPrimitives.Root>
      ))}
      <ToastPrimitives.Viewport className="fixed top-4 z-[100] flex w-full max-w-[420px] flex-col gap-2 p-4 sm:right-0 sm:top-0" />
    </ToastPrimitives.Provider>
  );
}
