import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Generate a random color based on the name
const getRandomColor = (name: string): string => {
  const colors = [
    "bg-red-500",
    "bg-blue-500", 
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-cyan-500",
  ];
  
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from full name
const getInitials = (name: string): string => {
  const words = name.trim().split(' ').filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  
  // First letter of first name + first letter of last name
  const firstInitial = words[0].charAt(0);
  const lastInitial = words[words.length - 1].charAt(0);
  
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  name = "", 
  size = "md", 
  className 
}) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const initials = getInitials(name);
  const backgroundColor = getRandomColor(name);

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {src && (
        <AvatarImage 
          src={src} 
          alt={name || "User avatar"} 
        />
      )}
      <AvatarFallback 
        className={`${backgroundColor} text-white font-medium ${textSizeClasses[size]}`}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};