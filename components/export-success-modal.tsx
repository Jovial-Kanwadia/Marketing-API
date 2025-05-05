"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { CheckCircle2 } from "lucide-react"

interface ExportSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  exportType: string
  exportUrl?: string
}

export function ExportSuccessModal({ isOpen, onClose, exportType, exportUrl }: ExportSuccessModalProps) {
  const handleOpenLooker = () => {
    if (exportUrl) {
      window.open(exportUrl, "_blank")
    }
    onClose()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <AlertDialogTitle className="text-xl">Export Successful</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {exportType === "looker" ? (
              <div className="space-y-2">
                <p>Your data has been successfully exported to Looker Studio.</p>
                <p>Click the button below to open Looker Studio and create your report.</p>
              </div>
            ) : (
              <p>Your data has been successfully exported as {exportType.toUpperCase()}.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          {exportType === "looker" && exportUrl && (
            <AlertDialogAction onClick={handleOpenLooker} className="bg-blue-600 hover:bg-blue-700">
              Open Looker Studio
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
