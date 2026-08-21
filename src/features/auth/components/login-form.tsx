"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { authApi } from "../api/auth-api";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});

type FormValues = z.infer<typeof schema>;

function safeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      router.replace(safeRedirectTarget(searchParams.get("redirectTo")));
    },
    onError: (error) => {
      showToast(getErrorMessage(error, { UNAUTHORIZED: "E-mail ou senha incorretos." }));
    },
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}
    >
      <TextField
        label="E-mail"
        type="email"
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Senha"
        type="password"
        error={!!errors.password}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" variant="contained" disabled={mutation.isPending}>
        Entrar
      </Button>
    </Box>
  );
}
