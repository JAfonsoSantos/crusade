import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CompanyAvatarProps {
  companyName: string;
  userName?: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CompanyAvatar({ 
  companyName,
  userName = "",
  logoUrl, 
  size = "md", 
  className = "" 
}: CompanyAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm", 
    lg: "h-12 w-12 text-base"
  };

  const getUserInitials = (fullName: string) => {
    if (!fullName) return "U";
    
    const words = fullName.trim().split(' ').filter(word => word.length > 0);
    
    if (words.length === 1) {
      // Single word: take first and last character
      const word = words[0];
      return word.length === 1 ? word.toUpperCase() : `${word[0]}${word[word.length - 1]}`.toUpperCase();
    } else {
      // Multiple words: take first character of first and last word
      return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500", 
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-orange-500"
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {logoUrl && <AvatarImage src={logoUrl} alt={companyName} />}
      <AvatarFallback className={`${getAvatarColor(userName || companyName)} text-white font-medium`}>
        {getUserInitials(userName)}
      </AvatarFallback>
    </Avatar>
  );
}