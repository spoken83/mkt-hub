"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ApprovalRequest } from "@/lib/types";

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onDecide?: (optionId: string) => void;
  disabled?: boolean;
}

export function ApprovalCard({ approval, onDecide, disabled }: ApprovalCardProps) {
  const decided = approval.decision != null;

  return (
    <Card className="max-w-2xl border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary">
            {approval.kind === "storyboard" ? "Storyboard approval" : "Publish approval"}
          </Badge>
          {decided && (
            <Badge className="bg-emerald-600">
              <Check className="mr-1 size-3" />
              Decided: {approval.decision}
            </Badge>
          )}
        </div>
        <CardTitle className="text-base">{approval.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {approval.options.map((option) => {
          const isChosen = approval.decision === option.id;
          return (
            <div
              key={option.id}
              className={cn(
                "rounded-xl border bg-card p-3 transition-colors",
                isChosen && "border-emerald-500 ring-1 ring-emerald-500"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {option.id !== option.label && (
                      <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                        {option.id}
                      </span>
                    )}
                    {option.label}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {option.summary}
                  </p>
                  {option.details && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {option.details.map((d) => (
                        <li key={d}>• {d}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {!decided && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onDecide?.(option.id)}
                    className="shrink-0"
                  >
                    Choose
                  </Button>
                )}
              </div>
              {option.images && option.images.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {option.images.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-28 rounded-lg border object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
