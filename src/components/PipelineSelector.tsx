import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Zap, Plus } from "lucide-react";
import { CreatePipelineModal } from "./CreatePipelineModal";

type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  is_default: boolean;
  is_active: boolean;
};

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  onPipelineChange: (pipelineId: string) => void;
  opportunityCount?: number;
}

export function PipelineSelector({ 
  pipelines, 
  selectedPipelineId, 
  onPipelineChange,
  opportunityCount = 0
}: PipelineSelectorProps) {
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">
          {selectedPipeline?.name || "Select Pipeline"}
        </h1>
        <Select value={selectedPipelineId || ""} onValueChange={onPipelineChange}>
          <SelectTrigger className="w-auto border-none shadow-none p-1 h-auto">
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[300px] bg-background border shadow-lg z-50">
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id} className="cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center gap-2 flex-1">
                    <Building2 className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{pipeline.name}</div>
                      {pipeline.description && (
                        <div className="text-xs text-muted-foreground">
                          {pipeline.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {pipeline.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                    {pipeline.source !== 'manual' && (
                      <Badge variant="outline" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        {pipeline.source}
                      </Badge>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
            <div className="border-t mt-1 pt-1">
              <CreatePipelineModal 
                trigger={
                  <div className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50 rounded-sm">
                    <Plus className="h-4 w-4" />
                    <span>Create Pipeline</span>
                  </div>
                }
              />
            </div>
          </SelectContent>
        </Select>
      </div>
      
      {selectedPipeline && (
        <div className="text-sm text-muted-foreground ml-auto">
          {opportunityCount} opportunities
        </div>
      )}
    </div>
  );
}