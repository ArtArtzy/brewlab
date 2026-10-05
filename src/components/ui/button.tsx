import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
const variants = cva("button", {
  variants: {
    variant: { default: "primary", outline: "outline", ghost: "ghost" },
    size: { default: "", sm: "small" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof variants>) {
  return (
    <button
      className={twMerge(clsx(variants({ variant, size }), className))}
      {...props}
    />
  );
}
