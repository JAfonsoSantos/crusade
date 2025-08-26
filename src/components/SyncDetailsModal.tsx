import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  PlusCircle, 
  RefreshCw, 
  Database,
  Calendar,
  FileText,
  Users,
  Building2,
  Target,
  Layers,
  X
} from 'lucide-react';

interface SyncOperation {
  created: number;
  updated: number;
  existing: number;
  errors: string[];
  items?: string[];
}

interface SyncDetails {
  timestamp: string;
  synced: number;
  errors: number;
  operations: {
    campaigns?: SyncOperation;
    flights?: SyncOperation;
    ad_spaces?: SyncOperation;
    creatives?: SyncOperation;
    brands?: SyncOperation;
    advertisers?: SyncOperation;
    sites?: SyncOperation;
    ad_units?: SyncOperation;
  };
}

interface SyncDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncDetails?: SyncDetails | null;
  integrationName: string;
}

const getOperationIcon = (operationType: string) => {
  switch (operationType) {
    case 'campaigns':
      return <Target className="h-4 w-4" />;
    case 'flights':
      return <Calendar className="h-4 w-4" />;
    case 'ad_spaces':
    case 'ad_units':
      return <Layers className="h-4 w-4" />;
    case 'creatives':
      return <FileText className="h-4 w-4" />;
    case 'brands':
      return <Building2 className="h-4 w-4" />;
    case 'advertisers':
      return <Users className="h-4 w-4" />;
    case 'sites':
      return <Database className="h-4 w-4" />;
    default:
      return <Database className="h-4 w-4" />;
  }
};

const getOperationLabel = (operationType: string) => {
  switch (operationType) {
    case 'campaigns':
      return 'Campaigns';
    case 'flights':
      return 'Flights';
    case 'ad_spaces':
      return 'Ad Spaces';
    case 'ad_units':
      return 'Ad Units';
    case 'creatives':
      return 'Creatives';
    case 'brands':
      return 'Brands';
    case 'advertisers':
      return 'Advertisers';
    case 'sites':
      return 'Sites';
    default:
      return operationType.charAt(0).toUpperCase() + operationType.slice(1);
  }
};

const OperationCard: React.FC<{
  operationType: string;
  operation: SyncOperation;
  onShowItems: (type: string, items: string[]) => void;
}> = ({ operationType, operation, onShowItems }) => {
  const total = operation.created + operation.updated + operation.existing;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {getOperationIcon(operationType)}
          {getOperationLabel(operationType)}
          <Badge variant="outline" className="ml-auto">
            {total} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 p-2 bg-green-50 dark:bg-green-950/20 rounded">
            <PlusCircle className="h-3 w-3 text-green-600" />
            <span className="font-medium">{operation.created}</span>
            <span className="text-muted-foreground">created</span>
          </div>
          <div className="flex items-center gap-1 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
            <RefreshCw className="h-3 w-3 text-blue-600" />
            <span className="font-medium">{operation.updated}</span>
            <span className="text-muted-foreground">updated</span>
          </div>
          <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-950/20 rounded">
            <CheckCircle className="h-3 w-3 text-gray-600" />
            <span className="font-medium">{operation.existing}</span>
            <span className="text-muted-foreground">existing</span>
          </div>
        </div>
        
        {operation.errors && operation.errors.length > 0 && (
          <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-1 text-red-600 text-xs font-medium mb-1">
              <AlertCircle className="h-3 w-3" />
              {operation.errors.length} error{operation.errors.length > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-red-700 dark:text-red-300">
              {operation.errors.slice(0, 2).map((error, idx) => (
                <div key={idx} className="truncate">{error}</div>
              ))}
              {operation.errors.length > 2 && (
                <div className="text-red-500">+{operation.errors.length - 2} more errors</div>
              )}
            </div>
          </div>
        )}
        
        {operation.items && operation.items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onShowItems(operationType, operation.items!)}
          >
            View {operation.items.length} item{operation.items.length > 1 ? 's' : ''}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const SyncDetailsModal: React.FC<SyncDetailsModalProps> = ({
  open,
  onOpenChange,
  syncDetails,
  integrationName
}) => {
  const details: SyncDetails = syncDetails ?? { timestamp: '', synced: 0, errors: 0, operations: {} as any };
  const [itemsModal, setItemsModal] = React.useState<{
    open: boolean;
    type: string;
    items: string[];
  }>({ open: false, type: '', items: [] });

  const handleShowItems = (type: string, items: string[]) => {
    setItemsModal({ open: true, type, items });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

const operations = Object.entries(details.operations || {}).filter(
  ([_, operation]) => operation && (operation.created > 0 || operation.updated > 0 || operation.existing > 0 || (operation.errors?.length ?? 0) > 0)
);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sync Details - {integrationName}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of the last synchronization operation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">{details.synced}</p>
                      <p className="text-xs text-muted-foreground">Items Synced</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-600">{details.errors}</p>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{details.timestamp ? formatDate(details.timestamp) : '—'}</p>
                      <p className="text-xs text-muted-foreground">Sync Time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Operations */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Operation Details</h3>
              {operations.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                    {operations.map(([operationType, operation]) => (
                      <OperationCard
                        key={operationType}
                        operationType={operationType}
                        operation={operation}
                        onShowItems={handleShowItems}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No operation details available</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Items Detail Modal */}
      <Dialog open={itemsModal.open} onOpenChange={(open) => setItemsModal({ ...itemsModal, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getOperationIcon(itemsModal.type)}
              {getOperationLabel(itemsModal.type)} Details
            </DialogTitle>
            <DialogDescription>
              List of {itemsModal.items.length} {getOperationLabel(itemsModal.type).toLowerCase()} from the sync
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {itemsModal.items.map((item, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium">{item}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setItemsModal({ ...itemsModal, open: false })}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SyncDetailsModal;