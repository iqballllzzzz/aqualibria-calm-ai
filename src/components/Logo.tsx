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
  const blockLogoAction = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} ${className} select-none pointer-events-none`}
      onContextMenu={blockLogoAction}
      onMouseDown={blockLogoAction}
    >
      <img
        src={logoImage}
        alt="AquaLibriaAI Logo"
        draggable={false}
        loading="eager"
        onContextMenu={blockLogoAction}
        onDragStart={blockLogoAction}
        className="w-full h-full object-contain select-none pointer-events-none"
      />
    </div>
  );
};

export default Logo;
