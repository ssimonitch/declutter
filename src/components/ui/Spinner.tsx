import React from "react";
import { clsx } from "clsx";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "current" | "suzu" | "blue" | "gray" | "white";
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "current",
  className,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const colorClasses = {
    current: "text-current",
    suzu: "text-suzu-primary-500",
    blue: "text-blue-600",
    gray: "text-suzu-neutral-600",
    white: "text-white",
  };

  return (
    <svg
      className={clsx(
        "animate-spin",
        sizeClasses[size],
        colorClasses[color],
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export default Spinner;
