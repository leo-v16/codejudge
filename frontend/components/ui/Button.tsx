import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

// Omit conflicting props from ButtonHTMLAttributes
type CombinedProps = Omit<ButtonProps, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd" | "style"> & 
                     HTMLMotionProps<"button"> & {
                       // Re-add style if needed, but usually motion handles it.
                       // keeping variant and size from ButtonProps
                       variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
                       size?: "sm" | "md" | "lg";
                     };

const Button = forwardRef<HTMLButtonElement, CombinedProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const variants = {
      primary: "bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.5)] border-none",
      secondary: "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] border-none",
      outline: "bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30 hover:border-cyan-400",
      ghost: "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border-none",
      danger: "bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300",
    };

    const sizes = {
      sm: "px-3 py-1 text-sm",
      md: "px-5 py-2.5",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "rounded-lg transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
export { Button };