import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Zap } from "lucide-react";

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
    <div className="flex items-center gap-4">
      <Select value={selectedPipelineId || ""} onValueChange={onPipelineChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a pipeline">
            {selectedPipeline && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{selectedPipeline.name}</span>
                {selectedPipeline.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {pipelines.map((pipeline) => (
            <SelectItem key={pipeline.id} value={pipeline.id}>
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
        </SelectContent>
      </Select>
      
      {selectedPipeline && (
        <div className="text-sm text-muted-foreground">
          {opportunityCount} opportunities
        </div>
      )}
    </div>
  );
}