import type { SVGProps } from "react";

// Iconos personalizados en estilo de línea (stroke) para categorías que
// lucide-react no cubre. Mismas convenciones que lucide: viewBox 24x24,
// stroke = currentColor, strokeWidth 2, sin relleno.

type IconProps = SVGProps<SVGSVGElement>;

export function SteeringWheelIcon(props: IconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Aro exterior */}
            <circle cx="12" cy="12" r="9" />
            {/* Centro / buje */}
            <circle cx="12" cy="12" r="2.5" />
            {/* Tres radios */}
            <path d="M3 12h6.5" />
            <path d="M14.5 12H21" />
            <path d="M12 14.5V21" />
        </svg>
    );
}

export function VrHeadsetIcon(props: IconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {/* Cuerpo del visor con muesca nasal */}
            <path d="M3 7h18a1 1 0 0 1 1 1v6a3 3 0 0 1-3 3h-3.6a2 2 0 0 1-1.7-1l-.4-.7a1.5 1.5 0 0 0-2.6 0l-.4.7a2 2 0 0 1-1.7 1H6a3 3 0 0 1-3-3z" />
            {/* Lentes */}
            <circle cx="8.5" cy="11.5" r="1.75" />
            <circle cx="15.5" cy="11.5" r="1.75" />
        </svg>
    );
}