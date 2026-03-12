import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Clock, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const featuredItems = [
  {
    id: 1,
    title: "MacBook Air M1 2020",
    price: "₦450,000",
    condition: "Like New",
    university: "UNILAG",
    image: "/lovable-uploads/103b276e-1a4f-4fea-a44c-85a983e46948.jpg",
    daysLeft: 5,
  },
  {
    id: 2,
    title: "Electric Standing Fan",
    price: "₦25,000",
    condition: "Good",
    university: "UNIBEN",
    image: "/lovable-uploads/9ce183c2-6cad-410c-b2cc-681a0dc1ccac.jpg",
    daysLeft: 3,
  },
  {
    id: 3,
    title: "Study Desk with Chair",
    price: "₦35,000",
    condition: "Fair",
    university: "LASU",
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop",
    daysLeft: 6,
  },
  {
    id: 4,
    title: "Samsung Galaxy S21",
    price: "₦180,000",
    condition: "Like New",
    university: "OOU",
    image: "/lovable-uploads/65066181-e698-4a14-a6bc-f2cb3d5de1d9.jpg",
    daysLeft: 2,
  },
  {
    id: 5,
    title: "Gas Cylinder",
    price: "₦45,000",
    condition: "Good",
    university: "UNIABUJA",
    image: "/lovable-uploads/26c4e1da-e29b-475a-89ae-4c5d8b819212.jpg",
    daysLeft: 4,
  },
  {
    id: 6,
    title: "Mini Refrigerator",
    price: "₦55,000",
    condition: "Good",
    university: "EKSU",
    image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=300&fit=crop",
    daysLeft: 7,
  },
];

const FeaturedItems = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNegotiate = () => {
    if (!user) {
      navigate("/signup");
    } else {
      navigate("/marketplace");
    }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Featured Items
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Discover great deals from students across Nigerian universities. 
              All items are verified and ready for negotiation.
            </p>
          </div>
          <Button variant="outline" className="mt-4 md:mt-0">
            View All Items
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredItems.map((item, index) => (
            <div
              key={item.id}
              className="group bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-secondary text-secondary-foreground">
                    {item.university}
                  </Badge>
                  <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
                    {item.condition}
                  </Badge>
                </div>
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{item.daysLeft}d left</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-display font-bold text-lg text-foreground mb-2 line-clamp-1">
                  {item.title}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{item.university} Campus</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-bold text-primary">
                    {item.price}
                  </span>
                  <Button size="sm" className="gap-2" onClick={handleNegotiate}>
                    <MessageCircle className="w-4 h-4" />
                    {user ? "Negotiate" : "Sign Up to Negotiate"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedItems;
