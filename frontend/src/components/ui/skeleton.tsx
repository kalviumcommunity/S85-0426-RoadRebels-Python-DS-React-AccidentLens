import * as React from "react"
import { cn } from "@/lib/utils"

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  )
)
Skeleton.displayName = "Skeleton"

export { Skeleton }
