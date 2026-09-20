import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const LoginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const CheckoutSchema = z.object({
  userId: z.string()
    .min(5, "El User ID es inválido")
    .max(15, "El User ID es inválido")
    .regex(/^[0-9]+$/, "El User ID solo debe contener números"),
  zoneId: z.string()
    .min(3, "El Zone ID es inválido")
    .max(6, "El Zone ID es inválido")
    .regex(/^[0-9]+$/, "El Zone ID solo debe contener números"),
  productId: z.string().min(1, "Debes seleccionar un producto válido"),
  paymentMethod: z.string().min(1, "Debes seleccionar un método de pago."),
  paymentDetail: z.string().max(60, "El dato de pago es demasiado largo.").optional(),
});

export const MLBBLookupSchema = z.object({
  userId: z.string().regex(/^\d{5,10}$/, "User ID debe tener entre 5 y 10 dígitos"),
  zoneId: z.string().regex(/^\d{3,5}$/, "Zone ID debe tener entre 3 y 5 dígitos"),
});
export type MLBBLookupInput = z.infer<typeof MLBBLookupSchema>;

// Retail markups per game (admin-editable). Stored as fractions: 0.05 = 5%.
export const PricingSettingsSchema = z.object({
  game: z.string().min(1, "Juego inválido."),
  markupUsd: z
    .number()
    .min(0, "El markup no puede ser negativo.")
    .max(1, "El markup no puede superar el 100%."),
  markupEur: z
    .number()
    .min(0, "El markup no puede ser negativo.")
    .max(1, "El markup no puede superar el 100%."),
});
export type PricingSettingsInput = z.infer<typeof PricingSettingsSchema>;

// Admin combo definition: 1-10 supplier packages with quantities, combined
// into a new sellable item whose cost is the sum of their checkout prices.
export const CreateStoreComboSchema = z.object({
  game: z.string().min(1, "Juego inválido."),
  name: z.string().trim().max(80, "El nombre es demasiado largo.").optional(),
  components: z
    .array(
      z.object({
        packageName: z.string().trim().min(1).max(120),
        qty: z
          .number()
          .int("La cantidad debe ser un número entero.")
          .min(1, "La cantidad mínima es 1.")
          .max(10, "La cantidad máxima por paquete es 10."),
      })
    )
    .min(1, "Añade al menos un paquete al combo.")
    .max(10, "Un combo puede combinar hasta 10 paquetes distintos."),
});
export type CreateStoreComboInput = z.infer<typeof CreateStoreComboSchema>;

// Per-item markup override: replaces the game's default for ONE sellable
// item (supplier package slug or combo id). Fractions: 0.05 = 5%.
export const ItemMarkupSchema = z.object({
  game: z.string().min(1, "Juego inválido."),
  itemKey: z.string().min(1, "Item inválido.").max(120, "Item inválido."),
  markupUsd: z
    .number()
    .min(0, "El markup no puede ser negativo.")
    .max(1, "El markup no puede superar el 100%."),
  markupEur: z
    .number()
    .min(0, "El markup no puede ser negativo.")
    .max(1, "El markup no puede superar el 100%."),
});
export type ItemMarkupInput = z.infer<typeof ItemMarkupSchema>;
