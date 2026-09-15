import {
  Armchair,
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Dumbbell,
  Gift,
  Laptop,
  Package,
  PawPrint,
  Shirt,
  Ticket,
  Wrench,
} from "lucide-react";

const icons = {
  Armchair,
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Dumbbell,
  Gift,
  Laptop,
  PawPrint,
  Shirt,
  Ticket,
  Wrench,
};

export function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Package;
  return <Icon size={size} aria-hidden="true" />;
}
