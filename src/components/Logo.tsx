import React from "react";
import logoImage from "@/assets/logo-new.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
};

const Logo: React.FC<LogoProps> = ({ size = "md", className = "" }) => {
  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <img
        src={logoImage}
        alt="AquaLibriaAI Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;
