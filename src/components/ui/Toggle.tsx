import React from "react";
import { clsx } from "clsx";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  className,
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleToggle();
    }
  };

  const sizeClasses = {
    sm: {
      switch: "w-8 h-4",
      thumb: "w-3 h-3",
      translate: "translate-x-4",
    },
    md: {
      switch: "w-11 h-6",
      thumb: "w-5 h-5",
      translate: "translate-x-5",
    },
    lg: {
      switch: "w-14 h-8",
      thumb: "w-7 h-7",
      translate: "translate-x-6",
    },
  };

  const { switch: switchSize, thumb: thumbSize, translate } = sizeClasses[size];

  return (
    <div className={clsx("flex items-start", className)}>
      <div className="flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyPress}
          disabled={disabled}
          className={clsx(
            "relative inline-flex flex-shrink-0 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation",
            switchSize,
            checked ? "bg-blue-600" : "bg-gray-200",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span className="sr-only">{label || "Toggle switch"}</span>
          <span
            className={clsx(
              "pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200",
              thumbSize,
              checked ? translate : "translate-x-0",
            )}
          />
        </button>
      </div>

      {(label || description) && (
        <div className="ml-3 flex-1">
          {label && (
            <label
              className={clsx(
                "block text-sm font-medium",
                disabled ? "text-gray-400" : "text-gray-700",
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              className={clsx(
                "text-sm",
                disabled ? "text-gray-300" : "text-gray-500",
              )}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Toggle;
