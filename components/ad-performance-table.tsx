import { useState } from "react"
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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"
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
import { AdPerformanceData } from "@/app/dashboard/page"

export function AdPerformanceTable({ data, isLoading }: { data: AdPerformanceData[], isLoading: boolean }) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})

    const columns: ColumnDef<AdPerformanceData>[] = [
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
            accessorKey: "Ad Name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Ad Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div>{row.getValue("Ad Name")}</div>,
        },
        {
            accessorKey: "Ad Set Name",
            header: "Ad Set Name",
            cell: ({ row }) => <div>{row.getValue("Ad Set Name")}</div>,
        },
        {
            accessorKey: "Campaing Name",
            header: "Campaign Name",
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
        },
        {
            accessorKey: "View Content",
            header: "View Content",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("View Content"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "View Content Conversion Value",
            header: "View Content Value",
            cell: ({ row }) => {
                const value = parseFloat(row.getValue("View Content Conversion Value"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Add To Wishlist",
            header: "Add To Wishlist",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Add To Wishlist"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Add To Wishlist Conversion Value",
            header: "Wishlist Value",
            cell: ({ row }) => {
                const value = parseFloat(row.getValue("Add To Wishlist Conversion Value"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Add To Cart",
            header: "Add To Cart",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Add To Cart"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Add To Cart Conversion Value",
            header: "Cart Value",
            cell: ({ row }) => {
                const value = parseFloat(row.getValue("Add To Cart Conversion Value"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Initiated Checkout",
            header: "Initiated Checkout",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Initiated Checkout"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Initiated Checkout Conversion Value",
            header: "Checkout Value",
            cell: ({ row }) => {
                const value = parseFloat(row.getValue("Initiated Checkout Conversion Value"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Adds Payment Info",
            header: "Add Payment Info",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Adds Payment Info"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Add Payment Info Conversion Value",
            header: "Payment Info Value",
            cell: ({ row }) => {
                const value = parseFloat(row.getValue("Add Payment Info Conversion Value"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Purchase",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Purchase
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Purchase"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Purchase Conversion Value",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Purchase Value
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const value = parseFloat(row.getValue("Purchase Conversion Value"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Leads",
            header: "Leads",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Leads"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Lead Conversion Value",
            header: "Lead Value",
            cell: ({ row }) => {
                const value = parseFloat(row.getValue("Lead Conversion Value"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Contact",
            header: "Contact",
            cell: ({ row }) => {
                const value = parseInt(row.getValue("Contact"))
                const formatted = new Intl.NumberFormat("en-US").format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
        {
            accessorKey: "Contact Conversion Value",
            header: "Contact Value",
            cell: ({ row }) => {
                const value = parseFloat(row.getValue("Contact Conversion Value"))
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                }).format(value)
                return <div className="text-right font-medium">{formatted}</div>
            },
        },
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
            <div className="flex items-center py-4">
                <Input
                    placeholder="Filter by ad name..."
                    value={(table.getColumn("Ad Name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("Ad Name")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            Columns <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
            <div className="rounded-md border">
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
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2">
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