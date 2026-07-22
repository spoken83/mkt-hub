import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { AgentPersona } from "@/lib/types";

interface AgentAvatarProps {
  agent: AgentPersona;
  size?: "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}

const sizeClasses = { sm: "size-9", md: "size-11", lg: "size-16" };
const dotClasses = { sm: "size-2.5", md: "size-3", lg: "size-4" };

export function AgentAvatar({
  agent,
  size = "md",
  online = true,
  className,
}: AgentAvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={agent.avatar} alt={agent.name} />
        <AvatarFallback
          className="font-medium text-white"
          style={{ backgroundColor: agent.accent }}
        >
          {agent.name[0]}
        </AvatarFallback>
      </Avatar>
      {online && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background bg-emerald-500",
            dotClasses[size]
          )}
        />
      )}
    </div>
  );
}
