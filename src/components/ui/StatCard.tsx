import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: {
    value: string | number;
    isPositive: boolean;
    label?: string; // Custom label for the change period
  };
  loading?: boolean;
  valueColor?: string;
  valueSize?: "sm" | "md" | "lg" | "xl";
  format?: "currency" | "number" | "percentage" | "compact";
  currencySymbol?: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  change,
  loading = false,
  valueColor = "text-gray-900",
  valueSize = "lg",
  format = "number",
  currencySymbol = "D",
  subtitle,
  onClick,
  className = "",
}: StatCardProps) {
  // Format the value based on the specified format
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace(/^/, "D");
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === "string") return val;

    switch (format) {
      case "currency":
        return formatCurrency(val as number);
      case "percentage":
        return `${val}%`;
      case "compact":
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        } else if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
        return val.toString();
      default:
        return val.toLocaleString();
    }
  };

  // Map value sizes to Tailwind classes
  const valueSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  // Animation classes
  const cardClasses = `
    stat-card 
    ${className} 
    transition-all 
    duration-300 
    hover:shadow-lg 
    ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}
    ${loading ? "animate-pulse" : ""}
  `;

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div
          className={`p-2 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 transition-colors duration-300 ${
            loading ? "opacity-50" : ""
          }`}
        >
          {icon}
        </div>
      </div>

      <p
        className={`mt-4 font-bold ${
          valueSizeClasses[valueSize]
        } ${valueColor} transition-all duration-300 ${
          loading ? "blur-sm" : ""
        }`}
      >
        {loading ? "..." : formatValue(value)}
      </p>

      {change && !loading && (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={`text-sm font-medium flex items-center ${
              change.isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            <span
              className={`inline-block transition-transform duration-300 ${
                change.isPositive ? "animate-bounce-up" : "animate-bounce-down"
              }`}
            >
              {change.isPositive ? "↑" : "↓"}
            </span>{" "}
            {typeof change.value === "number" && format === "percentage"
              ? `${change.value}%`
              : change.value}
          </span>
          <span className="text-sm text-gray-500">
            {change.label || "from last month"}
          </span>
        </div>
      )}
    </div>
  );
}
