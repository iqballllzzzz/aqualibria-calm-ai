import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import logoImage from "@/assets/logo.jpg";

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
  const { theme } = useTheme();

  return (
    <div 
      className={`relative ${sizeClasses[size]} ${className} rounded-xl overflow-hidden`}
      style={{
        backgroundColor: theme === "dark" ? "#000000" : "#ffffff",
      }}
    >
      <img
        src={logoImage}
        alt="AquaLibriaAI Logo"
        className="w-full h-full object-contain p-0.5"
      />
    </div>
  );
};

export default Logo;