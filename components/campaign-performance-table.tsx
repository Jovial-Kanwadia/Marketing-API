import { useState, useEffect } from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { CampaignPerformanceData } from "@/app/dashboard/page"

export function CampaignPerformanceTable({ data, isLoading }: { data: CampaignPerformanceData[], isLoading: boolean }) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        // Hide less important columns on mobile by default
        "ISO Week": false,
        "Month": false,
        "Year": false,
        "Buying Type": false,
        "Bid Strategy": false
    })
    const [rowSelection, setRowSelection] = useState({})

    // Set up responsive column visibility
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 640) { // sm breakpoint - very minimal columns for mobile
                setColumnVisibility({
                    "select": true,
                    "Date": true,
                    "Campaing Name": true,
                    "Amount Spent": true,
                    "Purchase": true,
                    "Purchase Conversion Value": true,
                })
            } else if (window.innerWidth < 768) { // md breakpoint - few more columns
                setColumnVisibility({
                    "select": true,
                    "Date": true,
                    "Campaing Name": true,
                    "Campaing Objective": true,
                    "Amount Spent": true,
                    "Reach": true,
                    "Impressions": true,
                    "Clicks (all)": true,
                })
            } else if (window.innerWidth < 1024) { // lg breakpoint - medium set of columns
                setColumnVisibility({
                    "ISO Week": false,
                    "Month": false,
                    "Year": false,
                    "Buying Type": false,
                    "Bid Strategy": false,
                })
            } else { // xl breakpoint - show most columns
                setColumnVisibility({
                    "ISO Week": false,
                    "Month": false,
                    "Year": false,
                })
            }
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const columns: ColumnDef<CampaignPerformanceData>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "Date",
            header: "Date",
            cell: ({ row }) => <div>{row.getValue("Date")}</div>,
        },
        {
            accessorKey: "ISO Week",
            header: "ISO Week",
            cell: ({ row }) => <div>{row.getValue("ISO Week")}</div>,
        },
        {
            accessorKey: "Month",
            header: "Month",
            cell: ({ row }) => <div>{row.getValue("Month")}</div>,
        },
        {
            accessorKey: "Year",
            header: "Year",
            cell: ({ row }) => <div>{row.getValue("Year")}</div>,
        },
        {
            accessorKey: "Campaing Name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Campaign Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div>{row.getValue("Campaing Name")}</div>,
        },
        {
            accessorKey: "Campaing Objective",
            header: "Campaign Objective",
            cell: ({ row }) => <div>{row.getValue("Campaing Objective")}</div>,
        },
        {
            accessorKey: "Buying Type",
            header: "Buying Type",
            cell: ({ row }) => <div>{row.getValue("Buying Type")}</div>,
        },
        {
            accessorKey: "Bid Strategy",
            header: "Bid Strategy",
            cell: ({ row }) => <div>{row.getValue("Bid Strategy")}</div>,
        },
        {
            accessorKey: "Amount Spent",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Amount Spent
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("Amount Spent"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(amount)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Reach",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Reach
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Reach"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Impressions",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Impressions
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Impressions"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Clicks (all)",
            header: "Clicks (all)",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Clicks (all)"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Link Clicks",
            header: "Link Clicks",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Link Clicks"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Landing Page views",
            header: "Landing Page Views",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Landing Page views"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        }
    ]

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    if (isLoading) {
        return (
            <div className="w-full space-y-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-8 w-[100px]" />
                </div>
                <div className="rounded-md border">
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row items-center py-4 gap-2">
                <Input
                    placeholder="Filter by campaign name..."
                    value={(table.getColumn("Campaing Name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("Campaing Name")?.setFilterValue(event.target.value)
                    }
                    className="w-full sm:max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto sm:ml-auto">
                            Columns <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border overflow-hidden">
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
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
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-4">
                <div className="text-sm text-muted-foreground order-2 sm:order-1">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="flex space-x-2 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}