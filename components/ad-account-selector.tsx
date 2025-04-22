"use client"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AdAccount {
    id: string
    name: string
}
interface AdAccountSelectorProps {
    onSelectAccount: (accountId: string) => void
    className?: string
}

export function AdAccountSelector({ onSelectAccount, className }: AdAccountSelectorProps) {
    const [accounts, setAccounts] = useState<AdAccount[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchAccounts = async () => {
            setIsLoading(true)
            try {
                const response = await fetch("/api/ad-accounts")
                const data = await response.json()
                setAccounts(data.accounts || [])

                // Auto-select the first account if available
                if (data.accounts && data.accounts.length > 0) {
                    onSelectAccount(data.accounts[0].id)
                }
            } catch (error) {
                console.error("Failed to fetch ad accounts:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAccounts()
    }, [onSelectAccount])

    return (
        <Select onValueChange={onSelectAccount} disabled={isLoading || accounts.length === 0}>
            <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading accounts..." : "Select an ad account"} />
            </SelectTrigger>
            <SelectContent>
                {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                        {account.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
