"use client"

import * as React from "react"
import { Toaster, toast as sonnerToast } from "sonner"

export type ToastProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive" | "success"
}

export function Sonner() {
  return <Toaster />
}

export function toast(props: ToastProps) {
  const { title, description, action, variant = "default", ...rest } = props

  return sonnerToast(title as string, {
    description,
    action,
    className: variant ? `toast-${variant}` : "",
    ...rest,
  })
}

export function useToast() {
  return {
    toast,
    dismiss: (id?: string) => {
      if (id) {
        sonnerToast.dismiss(id)
      } else {
        sonnerToast.dismiss()
      }
    },
  }
}