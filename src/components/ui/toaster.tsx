"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import React from "react"

export function Toaster() {
  const { toasts } = useToast()

  // Group toasts by position
  const positions = [
    "top-right",
    "top-center",
    "top-left",
    "bottom-right",
    "bottom-center",
    "bottom-left",
  ] as const;

  // Default position for toasts without a position
  const defaultPosition = "bottom-center";

  return (
    <ToastProvider>
      {positions.map((position) => (
        <React.Fragment key={position}>
          {toasts.filter(t => (t.position || defaultPosition) === position).map(({ id, title, description, action, ...props }) => (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </Toast>
          ))}
          <ToastViewport
            className={
              position === "top-right"
                ? "fixed top-4 right-4 z-50"
                : position === "top-center"
                ? "fixed top-4 left-1/2 -translate-x-1/2 z-50"
                : position === "top-left"
                ? "fixed top-4 left-4 z-50"
                : position === "bottom-right"
                ? "fixed bottom-4 right-4 z-50"
                : position === "bottom-center"
                ? "fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
                : position === "bottom-left"
                ? "fixed bottom-4 left-4 z-50"
                : "fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
            }
            key={position}
          />
        </React.Fragment>
      ))}
    </ToastProvider>
  )
}
