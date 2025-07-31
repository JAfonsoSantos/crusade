import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ShoppingCart, Star, Heart } from "lucide-react";
import KevelAd from "@/components/KevelAd";

// Mock product data for the demo retailer site
const products = [
  {
    id: 1,
    name: "Premium Wireless Headphones",
    price: 299.99,
    originalPrice: 399.99,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop",
    rating: 4.8,
    reviews: 2341,
    category: "Electronics"
  },
  {
    id: 2,
    name: "Smart Fitness Watch",
    price: 199.99,
    originalPrice: 249.99,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop",
    rating: 4.6,
    reviews: 1876,
    category: "Wearables"
  },
  {
    id: 3,
    name: "Organic Cotton T-Shirt",
    price: 29.99,
    originalPrice: 39.99,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop",
    rating: 4.9,
    reviews: 987,
    category: "Fashion"
  },
  {
    id: 4,
    name: "Professional Camera Lens",
    price: 899.99,
    originalPrice: 1199.99,
    image: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=300&h=300&fit=crop",
    rating: 4.7,
    reviews: 543,
    category: "Photography"
  }
];


const DemoSite = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary">TechMart</h1>
              <Badge variant="secondary" className="hidden md:block">Demo Retailer</Badge>
            </div>
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Top Banner Ad */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-center">
          <KevelAd id={4} size="728x90" position="Header Banner" />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block w-64 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">Electronics</Button>
                <Button variant="ghost" className="w-full justify-start">Fashion</Button>
                <Button variant="ghost" className="w-full justify-start">Home & Garden</Button>
                <Button variant="ghost" className="w-full justify-start">Sports</Button>
                <Button variant="ghost" className="w-full justify-start">Books</Button>
              </CardContent>
            </Card>

            {/* Sidebar Ad */}
            <div className="flex justify-center">
              <KevelAd id={5} size="300x250" position="Sidebar" adTypes={[5]} />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Featured Products</h2>
              <p className="text-muted-foreground">Discover our top-rated products</p>
            </div>

            {/* Mobile Banner Ad */}
            <div className="block lg:hidden mb-6">
              <KevelAd id={23} size="320x50" position="Mobile Banner" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden rounded-t-lg">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-4">
                      <Badge variant="outline" className="mb-2 text-xs">
                        {product.category}
                      </Badge>
                      <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                      <div className="flex items-center mb-2">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="ml-1 text-sm font-medium">{product.rating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({product.reviews} reviews)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold">${product.price}</span>
                          <span className="text-sm text-muted-foreground line-through ml-2">
                            ${product.originalPrice}
                          </span>
                        </div>
                        <Button size="sm">Add to Cart</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bottom Banner Ad */}
            <div className="mt-8 flex justify-center">
              <KevelAd id={4} size="728x90" position="Footer Banner" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 TechMart Demo. This is a demonstration retailer website for Crusade CRM.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DemoSite;