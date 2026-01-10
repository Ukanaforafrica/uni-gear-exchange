import { UserPlus, Search, MessageCircle, Handshake } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Sign Up & Select School",
    description: "Create your account and choose your university to access your campus marketplace.",
  },
  {
    icon: Search,
    title: "Browse or List Items",
    description: "Find items you need or list what you want to sell. Listings are visible for 7 days.",
  },
  {
    icon: MessageCircle,
    title: "Negotiate Securely",
    description: "Chat with sellers or buyers directly. First 3 messages are free!",
  },
  {
    icon: Handshake,
    title: "Meet Up & Complete",
    description: "Agree on a pickup location, meet safely on campus, and complete your transaction.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Trading on barndle' hotmarket is simple, safe, and student-friendly. 
            Here's how to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-border" />
              )}
              
              <div className="text-center relative z-10">
                {/* Step Number */}
                <div className="inline-flex items-center justify-center w-24 h-24 bg-background rounded-2xl shadow-soft mb-6 relative">
                  <step.icon className="w-10 h-10 text-primary" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
