import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type SpinnerProps = ComponentProps<typeof Loader2>;

export const Spinner = ({ className, ...props }: SpinnerProps) => (
  <Loader2 className={cn("animate-spin", className)} {...props} />
);
