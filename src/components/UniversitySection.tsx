import { GraduationCap } from "lucide-react";

const universities = [
  { name: "University of Benin", shortName: "UNIBEN" },
  { name: "University of Abuja", shortName: "UNIABUJA" },
  { name: "Ekiti State University", shortName: "EKSU" },
  { name: "Olabisi Onabanjo University", shortName: "OOU" },
  { name: "University of Lagos", shortName: "UNILAG" },
  { name: "Lagos State University", shortName: "LASU" },
];

const UniversitySection = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Available at Top Nigerian Universities
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Currently serving students across 6 major universities. Each campus has its own dedicated marketplace.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {universities.map((uni, index) => (
            <div
              key={uni.shortName}
              className="group p-6 bg-background rounded-2xl shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div className="font-display font-bold text-foreground mb-1">{uni.shortName}</div>
              <div className="text-xs text-muted-foreground">{uni.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UniversitySection;
