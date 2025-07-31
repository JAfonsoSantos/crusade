import { useEffect, useState, useRef } from 'react';
import { Settings, Copy, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface KevelAdProps {
  size: string;
  position: string;
  adTypes?: number[];
  networkId?: number;
  siteId?: number;
}

interface KevelDecision {
  adId: number;
  creativeId: number;
  flightId: number;
  campaignId: number;
  clickUrl: string;
  impressionUrl: string;
  contents: Array<{
    type: string;
    template: string;
    data: {
      imageUrl?: string;
      title?: string;
      body?: string;
      customData?: any;
    };
    body: string;
  }>;
}

interface KevelResponse {
  user: any;
  decisions: {
    [key: string]: KevelDecision;
  };
}

const KevelAd = ({ 
  size, 
  position, 
  adTypes = [4],
  networkId = 11833, 
  siteId = 1306350 
}: KevelAdProps) => {
  const [adContent, setAdContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const adRef = useRef<HTMLDivElement>(null);
  const impressionFired = useRef(false);
  
  // Debug state for editable parameters
  const [debugNetworkId, setDebugNetworkId] = useState(networkId);
  const [debugSiteId, setDebugSiteId] = useState(siteId);
  const [debugAdTypes, setDebugAdTypes] = useState(adTypes.join(','));
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  
  // Generate unique ID based on position and size to ensure proper Kevel placement tracking
  const adId = `${position.toLowerCase().replace(/\s+/g, '-')}-${size}`;

  useEffect(() => {
    const fetchAd = async () => {
      try {
        setLoading(true);
        setError(null);
        impressionFired.current = false; // Reset impression flag on new fetch
        
        const requestBody = {
          placements: [
            {
              networkId: debugNetworkId,
              siteId: debugSiteId,
              divName: `kevel-ad-${adId}`,
              count: 1,
              adTypes: debugAdTypes.split(',').map(Number)
            }
          ],
          user: {
            key: `demo-user-${Date.now()}`
          }
        };

        // Store request for debugging
        setLastRequest(requestBody);

        console.log('Kevel request:', requestBody);

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch('https://e-11833.adzerk.net/api/v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: KevelResponse = await response.json();
        
        // Store response for debugging
        setLastResponse(data);
        
        console.log('Kevel response:', data);
        
        const placementKey = `kevel-ad-${adId}`;
        const decisions = data.decisions?.[placementKey];
        const decision = Array.isArray(decisions) ? decisions[0] : decisions;
        
        if (decision && decision.contents && decision.contents.length > 0) {
          const content = decision.contents[0];
          setAdContent(content.body || content.template);
          
          // Fire impression tracking after a short delay
          setTimeout(() => {
            if (decision.impressionUrl && !impressionFired.current) {
              fetch(decision.impressionUrl, { mode: 'no-cors' });
              impressionFired.current = true;
              console.log('Impression fired for ad:', decision.adId);
            }
          }, 1000);
        } else {
          setAdContent(null);
          console.log('No ad decision returned for placement:', placementKey);
        }
      } catch (err) {
        console.error('Error fetching Kevel ad:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [adId, debugNetworkId, debugSiteId, debugAdTypes]); // Updated dependencies to trigger refresh when debug params change

  // Handle click tracking
  const handleAdClick = (event: React.MouseEvent) => {
    // Let the click proceed naturally, Kevel handles tracking via clickUrl
    console.log('Ad clicked:', adId);
  };

  // Debug handlers
  const handleRefreshAd = () => {
    // Trigger a re-fetch with current debug parameters
    setLoading(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getContainerClasses = () => {
    const baseClasses = "overflow-hidden rounded-lg";
    
    switch (size) {
      case "728x90":
        return `${baseClasses} w-full max-w-[728px] h-[90px]`;
      case "300x250":
        return `${baseClasses} w-[300px] h-[250px]`;
      case "320x50":
        return `${baseClasses} w-full max-w-[320px] h-[50px]`;
      default:
        return `${baseClasses} w-full h-[200px]`;
    }
  };

  if (loading) {
    return (
      <div className={`${getContainerClasses()} bg-muted animate-pulse flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading ad...</div>
          <div className="text-xs text-muted-foreground/70">{size} - {position}</div>
        </div>
      </div>
    );
  }

  if (error || !adContent) {
    return (
      <div className={`${getContainerClasses()} bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">
            {error ? 'Ad Load Error' : 'No Ad Available'}
          </div>
          <div className="text-xs text-muted-foreground/70">
            {size} - {position}
          </div>
          <div className="text-xs text-muted-foreground/50 mt-1">
            ID: {adId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={adRef}
      className={`${getContainerClasses()} relative group`}
      onClick={handleAdClick}
      style={{ cursor: adContent.includes('href=') ? 'pointer' : 'default' }}
    >
      {/* Debug Icon - Only visible on successful ad render */}
      <Dialog>
        <DialogTrigger asChild>
          <button 
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white p-1 rounded-md hover:bg-black/90"
            onClick={(e) => e.stopPropagation()}
          >
            <Settings className="h-3 w-3" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kevel Ad Debug Info - {position}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Editable Parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Request Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="networkId">Network ID</Label>
                  <Input
                    id="networkId"
                    value={debugNetworkId}
                    onChange={(e) => setDebugNetworkId(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="siteId">Site ID</Label>
                  <Input
                    id="siteId"
                    value={debugSiteId}
                    onChange={(e) => setDebugSiteId(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="adTypes">Ad Types (comma-separated)</Label>
                  <Input
                    id="adTypes"
                    value={debugAdTypes}
                    onChange={(e) => setDebugAdTypes(e.target.value)}
                    placeholder="4,5,6"
                  />
                </div>
              </div>
              <Button onClick={handleRefreshAd} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Ad with New Parameters
              </Button>
            </div>

            {/* Current Ad Info */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Current Ad Info</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">ID: {adId}</Badge>
                <Badge variant="outline">Size: {size}</Badge>
                <Badge variant="outline">Position: {position}</Badge>
              </div>
            </div>

            {/* Last Request */}
            {lastRequest && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Last Request</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(lastRequest, null, 2))}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(lastRequest, null, 2)}
                </pre>
              </div>
            )}

            {/* Last Response */}
            {lastResponse && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Last Response</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(lastResponse, null, 2))}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Content */}
      <div 
        dangerouslySetInnerHTML={{ __html: adContent }}
        className="w-full h-full"
      />
    </div>
  );
};

export default KevelAd;