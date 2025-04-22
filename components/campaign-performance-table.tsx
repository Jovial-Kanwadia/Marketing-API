"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from "@tanstack/react-table"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface CampaignPerformanceTableProps {
    data: any[]
    isLoading: boolean
}

export function CampaignPerformanceTable({ data, isLoading }: CampaignPerformanceTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "name",
            header: "Campaign Name",
        },
        {
            accessorKey: "status",
            header: "Status",
        },
        {
            accessorKey: "objective",
            header: "Objective",
        },
        {
            accessorKey: "spend",
            header: "Spend",
            cell: ({ row }) => {
                const amount = Number.parseFloat(row.getValue("spend") || "0")
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(amount)
                return formatted
            },
        },
        {
            accessorKey: "impressions",
            header: "Impressions",
            cell: ({ row }) => {
                return new Intl.NumberFormat("en-US").format(row.getValue("impressions") || 0)
            },
        },
        {
            accessorKey: "clicks",
            header: "Clicks",
            cell: ({ row }) => {
                return new Intl.NumberFormat("en-US").format(row.getValue("clicks") || 0)
            },
        },
        {
            accessorKey: "ctr",
            header: "CTR",
            cell: ({ row }) => {
                const value: any = row.getValue("ctr") || 0
                return `${(value * 100).toFixed(2)}%`
            },
        },
        {
            accessorKey: "cpc",
            header: "CPC",
            cell: ({ row }) => {
                const amount = Number.parseFloat(row.getValue("cpc") || "0")
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(amount)
                return formatted
            },
        },
    ]

    const table = useReactTable({
        data: data || [],
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    if (isLoading) {
        return <div className="text-center py-4">Loading campaign data...</div>
    }

    if (!data || data.length === 0) {
        return <div className="text-center py-4">No campaign data available. Please select an ad account.</div>
    }

    return (
        <div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    Next
                </Button>
            </div>
        </div>
    )
}
