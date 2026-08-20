"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import { authApi } from "../api/auth-api";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
  role: z.enum(["client", "organizer"]),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "client" },
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => router.replace("/"),
    onError: (error) => {
      showToast(getErrorMessage(error, { CONFLICT: "Esse e-mail já está cadastrado." }));
    },
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}
    >
      <TextField
        label="Nome"
        error={!!errors.name}
        helperText={errors.name?.message}
        {...register("name")}
      />
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
      <FormControl>
        <FormLabel id="role-label">Quero me cadastrar como</FormLabel>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <RadioGroup {...field} aria-labelledby="role-label">
              <FormControlLabel value="client" control={<Radio />} label="Cliente" />
              <FormControlLabel value="organizer" control={<Radio />} label="Organizador" />
            </RadioGroup>
          )}
        />
      </FormControl>
      <Button type="submit" variant="contained" disabled={mutation.isPending}>
        Criar conta
      </Button>
    </Box>
  );
}
