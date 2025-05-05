import type React from "react"
interface DashboardHeaderProps {
    heading: string
    text?: string
    children?: React.ReactNode
}

export function DashboardHeader({ heading, text, children }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 py-4">
            <div className="grid gap-1">
                <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
                {text && <p className="text-muted-foreground">{text}</p>}
            </div>
            <div className="w-full sm:w-auto">
                {children}
            </div>
        </div>
    )
}
