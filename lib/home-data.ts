import {
  Castle,
  ChevronRight,
  Crosshair,
  Ellipsis,
  Gamepad2,
  Gem,
  Ghost,
  Headset,
  MountainSnow,
  ShieldCheck,
  ShoppingBag,
  Skull,
  Sword,
  Target,
  Truck,
  Trophy,
  Users,
  Volleyball,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SteeringWheelIcon, SupportDialIcon, VrHeadsetIcon } from "@/components/home/category-icons";
import type { ComponentType, SVGProps } from "react";

// Cualquier icono de categoría: lucide o SVG personalizado con la misma API.
export type CategoryIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type CategoryIconName =
  | "Crosshair"
  | "MountainSnow"
  | "Sword"
  | "Target"
  | "Castle"
  | "Volleyball"
  | "SteeringWheel"
  | "Gamepad2"
  | "Skull"
  | "VrHeadset"
  | "Ellipsis";

export const CATEGORY_ICONS: Record<CategoryIconName, CategoryIcon> = {
  Crosshair,
  MountainSnow,
  Sword,
  Target,
  Castle,
  Volleyball,
  SteeringWheel: SteeringWheelIcon,
  Gamepad2,
  Skull,
  VrHeadset: VrHeadsetIcon,
  Ellipsis,
};

export type GameCategory = {
  name: string;
  icon: CategoryIconName;
};

export const GAME_CATEGORIES: GameCategory[] = [
  { name: "ACCIÓN", icon: "Crosshair" },
  { name: "AVENTURA", icon: "MountainSnow" },
  { name: "RPG", icon: "Sword" },
  { name: "FPS", icon: "Target" },
  { name: "ESTRATEGIA", icon: "Castle" },
  { name: "DEPORTES", icon: "Volleyball" },
  { name: "CARRERAS", icon: "SteeringWheel" },
  { name: "INDIE", icon: "Gamepad2" },
  { name: "TERROR", icon: "Skull" },
  { name: "VR", icon: "VrHeadset" },
  { name: "VER MÁS", icon: "Ellipsis" },
];

export type NavCategory = {
  label: string;
  href: string;
  highlight?: boolean;
};

export const NAV_CATEGORIES: NavCategory[] = [
  { label: "Juegos", href: "#" },
  { label: "Tarjetas regalo", href: "#" },
  { label: "Suscripciones", href: "#" },
  { label: "DLC", href: "#" },
  { label: "Software", href: "#" },
  { label: "Gaming Points", href: "#" },
  { label: "Top-Up", href: "/topup/mlbb" },
  { label: "Ofertas", href: "#" },
];

export type SidebarFeature = {
  icon: LucideIcon;
  title: string;
};

export const SIDEBAR_FEATURES: SidebarFeature[] = [
  { icon: Zap, title: "ENTREGA INSTANTÁNEA" },
  { icon: Gem, title: "PRECIOS IMBATIBLES" },
  { icon: ShieldCheck, title: "PAGOS 100% SEGUROS" },
  { icon: Headset, title: "ATENCIÓN 24/7" },
];

export type ColorAccent = "neon-pink" | "neon-cyan" | "neon-purple";

export type Platform = "STEAM" | "TOP-UP" | "PS5" | "XBOX" | "EPIC GAMES";

export type Product = {
  id: string;
  title: string;
  image: string;
  imageContain?: boolean;
  badge: string;
  badgeClass: string;
  price: string;
  originalPrice?: string;
  accent: ColorAccent;
  platform: Platform;
  meta?: string;
  href?: string;
};

// Solo se vende top-up de Mobile Legends: el grid muestra la única tarjeta real.
export const BEST_SELLERS: Product[] = [
  {
    id: "mlbb-topup",
    title: "Recarga Mobile Legends",
    image: "/mlbb.png",
    badge: "INSTANT",
    badgeClass: "bg-[#9E40C0] text-white",
    price: "Desde US$1.49",
    accent: "neon-cyan",
    platform: "TOP-UP",
    meta: "ID verification active",
    href: "/topup/mlbb",
  },
];

export type TrustItem = {
  icon: CategoryIcon;
  title: string;
  subtitle: string;
};

export const TRUST_ITEMS: TrustItem[] = [
  { icon: ShieldCheck, title: "MILES DE PRODUCTOS", subtitle: "A LOS MEJORES PRECIOS" },
  { icon: Truck, title: "ENVÍO INSTANTÁNEO", subtitle: "RECIBE AL MOMENTO" },
  { icon: ShoppingBag, title: "PAGOS SEGUROS", subtitle: "MÚLTIPLES MÉTODOS" },
  { icon: SupportDialIcon, title: "SOPORTE 24/7", subtitle: "SIEMPRE PARA TI" },
  { icon: Users, title: "COMUNIDAD GAMER", subtitle: "ÚNETE Y AHORRA" },
];

export const FLASH_OFFER_TIMER = { hours: "02", minutes: "45", seconds: "38" };
