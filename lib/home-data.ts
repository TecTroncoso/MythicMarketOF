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
  { label: "Ofertas", href: "#", highlight: true },
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

export const BEST_SELLERS: Product[] = [
  {
    id: "fc24",
    title: "EA SPORTS FC™ 24",
    image: "/images/soccer_cover.png",
    badge: "-72%",
    badgeClass: "bg-[#9E40C0] text-white",
    price: "US$19.99",
    originalPrice: "US$69.99",
    accent: "neon-pink",
    platform: "STEAM",
  },
  {
    id: "cod-mw3",
    title: "Call of Duty: MWIII",
    image: "/images/shooter_cover.png",
    badge: "-45%",
    badgeClass: "bg-[#9E40C0] text-white",
    price: "US$38.99",
    originalPrice: "US$69.99",
    accent: "neon-cyan",
    platform: "STEAM",
  },
  {
    id: "elden-ring",
    title: "ELDEN RING",
    image: "/images/fantasy_cover.png",
    badge: "-34%",
    badgeClass: "bg-[#9E40C0] text-white",
    price: "US$39.59",
    originalPrice: "US$59.99",
    accent: "neon-purple",
    platform: "STEAM",
  },
  {
    id: "mlbb-topup",
    title: "Recarga Mobile Legends",
    image: "/mlbb-logo.png",
    imageContain: true,
    badge: "INSTANT",
    badgeClass: "bg-[#9E40C0] text-white",
    price: "Desde US$1.49",
    accent: "neon-cyan",
    platform: "TOP-UP",
    meta: "ID verification active",
    href: "/topup/mlbb",
  },
  {
    id: "spider-man-2",
    title: "Marvel's Spider-Man 2",
    image: "/images/hero_cover.png",
    badge: "-29%",
    badgeClass: "bg-[#9E40C0] text-white",
    price: "US$49.99",
    originalPrice: "US$69.99",
    accent: "neon-pink",
    platform: "PS5",
  },
  {
    id: "fortnite",
    title: "Fortnite — V-Bucks",
    image: "/images/fortnite_cover.png",
    badge: "-15%",
    badgeClass: "bg-[#9E40C0] text-white",
    price: "US$10.19",
    originalPrice: "US$11.99",
    accent: "neon-cyan",
    platform: "EPIC GAMES",
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
