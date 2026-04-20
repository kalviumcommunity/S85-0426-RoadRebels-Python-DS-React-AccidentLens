import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
        fatal: "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse",
        severe: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
        moderate: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
        minor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
        success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
        warning: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
        destructive: "bg-red-500/20 text-red-300 border border-red-500/30",
        outline: "border border-white/20 text-muted-foreground",
        secondary: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
