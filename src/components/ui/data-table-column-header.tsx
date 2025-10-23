import { type Column } from "@tanstack/table-core"
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline"
import { cn } from "../../lib/utils"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  center?: boolean
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  center = false,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div 
        className={cn(
          "text-xs font-semibold text-gray-500 uppercase tracking-wide",
          center && "text-center",
          className
        )}
        {...props}
      >
        {title}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer flex items-center hover:text-gray-700 transition-colors",
        center && "justify-center",
        className
      )}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      {...props}
    >
      {title}
      {column.getIsSorted() === "desc" ? (
        <ArrowDownIcon className="ml-1 h-3 w-3" />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUpIcon className="ml-1 h-3 w-3" />
      ) : null}
    </div>
  )
}