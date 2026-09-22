import {
  Baby,
  CarFront,
  Clapperboard,
  Gift,
  Handbag,
  House,
  Package,
  PawPrint,
  Smartphone,
  Store,
  Tent,
  Ticket,
  Wrench,
} from "lucide-react";

const icons = {
  Ticket,
  House,
  Store,
  CarFront,
  Smartphone,
  Baby,
  PawPrint,
  Tent,
  Handbag,
  Clapperboard,
  Gift,
  Package,
  Wrench,
  Armchair: House,
  BriefcaseBusiness: Store,
  Car: CarFront,
  Laptop: Smartphone,
  Dumbbell: Tent,
  Shirt: Handbag,
  BookOpen: Clapperboard,
};

export function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Package;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
