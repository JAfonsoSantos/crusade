import { useEffect, useState, useRef } from 'react';

interface KevelAdProps {
  adUnitId: number;
  size: string;
  position: string;
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
  adUnitId, 
  size, 
  position, 
  networkId = 11833, 
  siteId = 1306350 
}: KevelAdProps) => {
  const [adContent, setAdContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const adRef = useRef<HTMLDivElement>(null);
  const impressionFired = useRef(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const requestBody = {
          placements: [
            {
              networkId: networkId,
              siteId: siteId,
              divName: `kevel-ad-${adUnitId}`,
              count: 1,
              adTypes: [4] // Leaderboard ad type
            }
          ],
          user: {
            key: `demo-user-${Date.now()}`
          }
        };

        console.log('Kevel request:', requestBody);

        const response = await fetch('https://e-11833.adzerk.net/api/v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: KevelResponse = await response.json();
        console.log('Kevel response:', data);
        
        const placementKey = `kevel-ad-${adUnitId}`;
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
  }, [adUnitId, networkId, siteId]);

  // Handle click tracking
  const handleAdClick = (event: React.MouseEvent) => {
    // Let the click proceed naturally, Kevel handles tracking via clickUrl
    console.log('Ad clicked:', adUnitId);
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
            Unit ID: {adUnitId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={adRef}
      className={getContainerClasses()}
      onClick={handleAdClick}
      style={{ cursor: adContent.includes('href=') ? 'pointer' : 'default' }}
    >
      <div 
        dangerouslySetInnerHTML={{ __html: adContent }}
        className="w-full h-full"
      />
    </div>
  );
};

export default KevelAd;