import type { SVGProps } from "react";
import type { Product } from "@/lib/home-data";

// Iconos SVG simplificados de plataformas para los badges de las tarjetas.
// Estilo monocromático (currentColor) para integrarse con la píldora translúcida.

type IconProps = SVGProps<SVGSVGElement>;

function SteamIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="15" cy="9" r="2.5" />
            <circle cx="8.5" cy="15.5" r="2" />
            <path d="M10.2 14.2l3.4-3.1" />
        </svg>
    );
}

function PlayStationIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Trazo vertical de la "P" */}
            <path d="M8 5v13l3 1V6z" />
            {/* Lazo superior */}
            <path d="M12 8.2c3.2-1.1 6 .1 6 2.4 0 2.4-2.9 3.5-6 2.4" />
        </svg>
    );
}

function XboxIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M7.2 7.2c3.2 3.2 6.4 6.4 9.6 9.6" />
            <path d="M16.8 7.2c-3.2 3.2-6.4 6.4-9.6 9.6" />
        </svg>
    );
}

function EpicGamesIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Escudo del logo */}
            <path d="M5 4h14v11.5L12 20l-7-4.5z" />
            {/* "E" estilizada */}
            <path d="M9.5 8.5h5" />
            <path d="M9.5 12h5" />
        </svg>
    );
}

function TopUpIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Rayo de recarga instantánea */}
            <path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z" />
        </svg>
    );
}

export const PLATFORM_ICONS: Record<Product["platform"], (props: IconProps) => React.JSX.Element> = {
    STEAM: SteamIcon,
    PS5: PlayStationIcon,
    XBOX: XboxIcon,
    "EPIC GAMES": EpicGamesIcon,
    "TOP-UP": TopUpIcon,
};