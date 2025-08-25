import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Filter, Calendar, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/AccessDenied';

const Reports = () => {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [dateRange, setDateRange] = useState('year');

  // Check permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!hasPermission('insights')) {
    return <AccessDenied 
      module="insights" 
      title="Insights & Reports"
      description="Ver relatórios e análises de performance das campanhas."
    />;
  }

  // Mock data for KPIs
  const kpiData = [
    {
      title: 'Spend',
      value: '$362K',
      change: '+5%',
      trend: 'up',
      subtitle: 'vs last year'
    },
    {
      title: 'Impressions',
      value: '362K',
      change: '+5%',
      trend: 'up',
      subtitle: 'vs last year'
    },
    {
      title: 'Clicks',
      value: '4.2K',
      change: '-2%',
      trend: 'down',
      subtitle: 'vs last year'
    },
    {
      title: 'CTR',
      value: '$362K',
      change: '+5%',
      trend: 'up',
      subtitle: 'vs last year'
    },
    {
      title: 'ROAS',
      value: '4.2X',
      change: '+8%',
      trend: 'up',
      subtitle: 'vs last year'
    },
    {
      title: 'Sales',
      value: '$362K',
      change: '+3%',
      trend: 'up',
      subtitle: 'vs last year'
    }
  ];

  // Mock data for chart
  const chartData = [
    { month: 'Jan', 'Product Listing Ads': 45000, 'Auction Banner': 35000, 'Sponsorship Banner': 25000, 'Meta': 40000, 'Pinterest': 30000, 'Google': 50000 },
    { month: 'Feb', 'Product Listing Ads': 42000, 'Auction Banner': 38000, 'Sponsorship Banner': 28000, 'Meta': 42000, 'Pinterest': 32000, 'Google': 48000 },
    { month: 'Mar', 'Product Listing Ads': 48000, 'Auction Banner': 35000, 'Sponsorship Banner': 22000, 'Meta': 38000, 'Pinterest': 28000, 'Google': 52000 },
    { month: 'Apr', 'Product Listing Ads': 65000, 'Auction Banner': 45000, 'Sponsorship Banner': 35000, 'Meta': 48000, 'Pinterest': 38000, 'Google': 65000 },
    { month: 'May', 'Product Listing Ads': 40000, 'Auction Banner': 30000, 'Sponsorship Banner': 20000, 'Meta': 35000, 'Pinterest': 25000, 'Google': 45000 },
    { month: 'Jun', 'Product Listing Ads': 68000, 'Auction Banner': 48000, 'Sponsorship Banner': 38000, 'Meta': 52000, 'Pinterest': 42000, 'Google': 70000 },
    { month: 'Jul', 'Product Listing Ads': 35000, 'Auction Banner': 25000, 'Sponsorship Banner': 15000, 'Meta': 30000, 'Pinterest': 20000, 'Google': 40000 },
    { month: 'Aug', 'Product Listing Ads': 45000, 'Auction Banner': 35000, 'Sponsorship Banner': 25000, 'Meta': 40000, 'Pinterest': 30000, 'Google': 50000 },
    { month: 'Sep', 'Product Listing Ads': 55000, 'Auction Banner': 45000, 'Sponsorship Banner': 35000, 'Meta': 50000, 'Pinterest': 40000, 'Google': 60000 },
    { month: 'Oct', 'Product Listing Ads': 50000, 'Auction Banner': 40000, 'Sponsorship Banner': 30000, 'Meta': 45000, 'Pinterest': 35000, 'Google': 55000 },
    { month: 'Nov', 'Product Listing Ads': 35000, 'Auction Banner': 25000, 'Sponsorship Banner': 15000, 'Meta': 30000, 'Pinterest': 20000, 'Google': 40000 },
    { month: 'Dec', 'Product Listing Ads': 25000, 'Auction Banner': 15000, 'Sponsorship Banner': 10000, 'Meta': 20000, 'Pinterest': 15000, 'Google': 30000 }
  ];

  // Mock data for channel performance table
  const channelData = [
    {
      channel: 'Product Listing Ads',
      impressions: '180,000',
      clicks: '190,000',
      ctr: '0.35%',
      cpc: '$1.34',
      spend: '$90,000',
      roas: '$1.45',
      sales: '$390,000'
    },
    {
      channel: 'Auction Banner',
      impressions: '190,000',
      clicks: '160,000',
      ctr: '0.35%',
      cpc: '$1.34',
      spend: '$80,000',
      roas: '$1.45',
      sales: '$350,000'
    },
    {
      channel: 'Sponsorship Banner',
      impressions: '180,000',
      clicks: '190,000',
      ctr: '0.35%',
      cpc: '$1.34',
      spend: '$90,000',
      roas: '$1.45',
      sales: '$390,000'
    },
    {
      channel: 'Meta',
      impressions: '180,000',
      clicks: '190,000',
      ctr: '0.35%',
      cpc: '$1.34',
      spend: '$90,000',
      roas: '$1.45',
      sales: '$390,000'
    },
    {
      channel: 'Pinterest',
      impressions: '180,000',
      clicks: '190,000',
      ctr: '0.35%',
      cpc: '$1.34',
      spend: '$90,000',
      roas: '$1.45',
      sales: '$390,000'
    },
    {
      channel: 'Google',
      impressions: '180,000',
      clicks: '190,000',
      ctr: '0.35%',
      cpc: '$1.34',
      spend: '$90,000',
      roas: '$1.45',
      sales: '$390,000'
    }
  ];

  // Mock data for trending campaigns
  const trendingCampaigns = [
    {
      channel: 'Meta',
      campaign: 'Stunning Outdoor Living Deals',
      impressions: '190,000',
      trend: '+18'
    },
    {
      channel: 'Auction Banner',
      campaign: 'Other More than Garden Essentials',
      impressions: '120,000',
      trend: '+16'
    },
    {
      channel: 'Google',
      campaign: 'Upgrade every Room This Spring',
      impressions: '110,000',
      trend: '+15'
    },
    {
      channel: 'Auction Banner',
      campaign: 'Power Up Your DIY Projects',
      impressions: '190,000',
      trend: '+15'
    }
  ];

  const chartConfig = {
    'Product Listing Ads': {
      label: 'Product Listing Ads',
      color: 'hsl(var(--chart-1))'
    },
    'Auction Banner': {
      label: 'Auction Banner',
      color: 'hsl(var(--chart-2))'
    },
    'Sponsorship Banner': {
      label: 'Sponsorship Banner',
      color: 'hsl(var(--chart-3))'
    },
    'Meta': {
      label: 'Meta',
      color: 'hsl(var(--chart-4))'
    },
    'Pinterest': {
      label: 'Pinterest',
      color: 'hsl(var(--chart-5))'
    },
    'Google': {
      label: 'Google',
      color: 'hsl(var(--primary))'
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Channel Performance Overview</h1>
          <p className="text-muted-foreground">Monitor your advertising channels performance and ROI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range: {dateRange === 'year' ? '28 Jun 2024 - 28 Jan 2025' : 'Custom Range'}
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter (2)
          </Button>
        </div>
      </div>

      {/* Channel Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Configurations</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Cross Channel</Badge>
          <Badge variant="outline">Single Channel</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Channels:</span>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="meta">Meta</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="pinterest">Pinterest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="sm">
          Compare: Year over Year <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="link" size="sm">
          Clear All
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-4">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <div className={`flex items-center text-sm ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {kpi.change}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Channel Performance Overview</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Platforms</span>
                <span className="text-sm">Channels</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Monthly</span>
                <span className="text-sm">Metrics: Impressions</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Product Listing Ads" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Auction Banner" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Sponsorship Banner" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Meta" 
                  stroke="hsl(var(--chart-4))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Pinterest" 
                  stroke="hsl(var(--chart-5))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Google" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Channel Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Channel</th>
                  <th className="text-left p-3 font-medium">Impressions</th>
                  <th className="text-left p-3 font-medium">Clicks</th>
                  <th className="text-left p-3 font-medium">CTR</th>
                  <th className="text-left p-3 font-medium">CPC</th>
                  <th className="text-left p-3 font-medium">Spend</th>
                  <th className="text-left p-3 font-medium">ROAS</th>
                  <th className="text-left p-3 font-medium">Sales</th>
                </tr>
              </thead>
              <tbody>
                {channelData.map((channel, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        {channel.channel}
                      </div>
                    </td>
                    <td className="p-3">{channel.impressions}</td>
                    <td className="p-3">{channel.clicks}</td>
                    <td className="p-3">{channel.ctr}</td>
                    <td className="p-3">{channel.cpc}</td>
                    <td className="p-3">{channel.spend}</td>
                    <td className="p-3">{channel.roas}</td>
                    <td className="p-3">{channel.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trending Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trending Campaigns</CardTitle>
            <Select defaultValue="impressions">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by Impressions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="impressions">Sort by Impressions</SelectItem>
                <SelectItem value="clicks">Sort by Clicks</SelectItem>
                <SelectItem value="spend">Sort by Spend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trendingCampaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div>
                    <p className="font-medium">{campaign.channel}</p>
                    <p className="text-sm text-muted-foreground">{campaign.campaign}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{campaign.impressions}</span>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">{campaign.trend}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;