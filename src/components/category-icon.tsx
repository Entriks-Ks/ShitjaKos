import Image from "next/image";
import {
  Baby,
  CarFront,
  Clapperboard,
  Gift,
  Handbag,
  House,
  MonitorSmartphone,
  Package,
  PawPrint,
  Store,
  Tent,
  Tickets,
  Wrench,
} from "lucide-react";
import { categoryPhoto } from "@/lib/category-photos";

const icons = {
  Ticket: Tickets,
  House,
  Store,
  CarFront,
  Smartphone: MonitorSmartphone,
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
  Laptop: MonitorSmartphone,
  Dumbbell: Tent,
  Shirt: Handbag,
  BookOpen: Clapperboard,
};

export function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Package;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}

export function CategoryOrbPhoto({
  id,
  icon,
  size = 64,
}: {
  id: string;
  icon: string;
  size?: number;
}) {
  const src = categoryPhoto(id);
  if (!src) return <CategoryIcon name={icon} size={Math.round(size * 0.4)} />;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="category-orb-photo"
      sizes={`${size}px`}
    />
  );
}
