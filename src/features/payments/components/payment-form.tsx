"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

const schema = z.object({
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s+/g, ""))
    .refine((value) => /^\d{13,19}$/.test(value), "Informe um número de cartão válido"),
});

type FormValues = z.infer<typeof schema>;

export function PaymentForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (cardNumber: string) => void;
  disabled?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => onSubmit(values.cardNumber))}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}
    >
      <TextField
        label="Número do cartão"
        error={!!errors.cardNumber}
        helperText={errors.cardNumber?.message}
        {...register("cardNumber")}
      />
      <Button type="submit" variant="contained" disabled={disabled}>
        Pagar
      </Button>
    </Box>
  );
}
