import React from "react";

interface SystemMessageProps {
  variant?: "info" | "success" | "error" | "default";
  children: React.ReactNode;
}

export default function SystemMessage({ variant = "default", children }: SystemMessageProps) {
  const variantStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    default: "bg-neutral-200 text-neutral-900"
  };

  return (
    <div className={`system-message rounded-lg p-3 text-center ${variantStyles[variant]}`}>
      <p className="text-sm">{children}</p>
    </div>
  );
}
