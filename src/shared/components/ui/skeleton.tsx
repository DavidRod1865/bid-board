function Skeleton({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={`bg-gray-200 animate-pulse rounded-md ${className}`}
      {...props}
    />
  )
}

// Table skeleton component for better UX
function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Table header skeleton */}
      <div className="grid gap-4 p-4 border-b" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} className="h-4" />
        ))}
      </div>
      
      {/* Table rows skeleton */}
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={`row-${rowIndex}`} 
            className="grid gap-4 p-4 hover:bg-gray-50" 
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export { Skeleton, TableSkeleton }
