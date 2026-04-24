import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_60px_hsl(173_58%_45%/0.15)] hover:shadow-lg",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-[hsl(173,58%,45%)] to-[hsl(180,60%,40%)] text-[hsl(222,47%,4%)] hover:opacity-90 shadow-[0_0_60px_hsl(173_58%_45%/0.15)] hover:shadow-lg transform hover:scale-[1.02]",
        analyze: "bg-gradient-to-r from-[hsl(173,58%,45%)] to-[hsl(180,60%,40%)] text-[hsl(222,47%,4%)] hover:opacity-90 shadow-[0_0_60px_hsl(173_58%_45%/0.15)] hover:shadow-lg transform hover:scale-[1.02] text-base py-6 px-8",
        danger: "bg-gradient-to-r from-[hsl(0,72%,55%)] to-[hsl(20,80%,50%)] text-foreground hover:opacity-90 shadow-lg",
        safe: "bg-gradient-to-r from-[hsl(160,60%,45%)] to-[hsl(173,58%,45%)] text-[hsl(222,47%,4%)] hover:opacity-90 shadow-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
