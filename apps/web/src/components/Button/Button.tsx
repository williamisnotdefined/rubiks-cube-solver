import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@src/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-semibold transition-[transform,box-shadow,background-color,color,border-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  {
    defaultVariants: {
      size: 'default',
      variant: 'primary',
    },
    variants: {
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        icon: 'size-10',
        lg: 'h-12 px-6 text-base has-[>svg]:px-4',
        md: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5',
      },
      variant: {
        default:
          'border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_var(--foreground)] hover:bg-primary/90 disabled:border-dashed disabled:border-foreground/40 disabled:bg-muted disabled:text-muted-foreground',
        destructive:
          'border-2 border-foreground bg-destructive text-cube-white shadow-[3px_3px_0_var(--foreground)] hover:bg-destructive/90 disabled:border-dashed disabled:border-foreground/40 disabled:bg-muted disabled:text-muted-foreground',
        ghost: 'border-2 border-transparent hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        outline:
          'border-2 border-foreground bg-background shadow-[3px_3px_0_var(--foreground)] hover:bg-accent hover:text-accent-foreground disabled:border-dashed disabled:border-foreground/40 disabled:bg-muted disabled:text-muted-foreground',
        primary:
          'border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_var(--foreground)] hover:bg-primary/90 disabled:border-dashed disabled:border-foreground/40 disabled:bg-muted disabled:text-muted-foreground',
        secondary:
          'border-2 border-foreground bg-secondary text-secondary-foreground shadow-[3px_3px_0_var(--foreground)] hover:bg-secondary/80 disabled:border-dashed disabled:border-foreground/40 disabled:bg-muted disabled:text-muted-foreground',
      },
    },
  },
)

type ButtonProps = ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={cn(buttonVariants({ className, size, variant }))}
      data-slot='button'
      {...props}
    />
  )
}
