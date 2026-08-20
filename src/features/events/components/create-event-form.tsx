"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { eventsApi } from "../api/events-api";
import { CreateEventInput } from "../types";
import { MoviePicker } from "@/features/catalog/components/movie-picker";
import { CatalogMovie } from "@/features/catalog/types";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

const schema = z.object({
  movie: z
    .custom<CatalogMovie | null>()
    .refine((value): value is CatalogMovie => value !== null, "Escolha um filme do catálogo"),
  date: z
    .string()
    .min(1, "Informe a data e hora")
    .transform((value) => new Date(value).toISOString()),
  location: z.string().min(2, "Informe o local"),
  capacity: z.coerce
    .number({ error: "Informe a capacidade" })
    .int()
    .positive("A capacidade precisa ser maior que zero")
    .max(260, "A capacidade máxima é 260 lugares"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um preço válido, ex: 39.90"),
});

// z.input (pre-parse shape, matches useForm's defaultValues/register) differs from
// z.output (post-transform/coerce shape, what onValid receives) — see the `capacity`
// and `date` fields above. Passing both generics to useForm is required for this to
// type-check; a single shared type here causes a Resolver assignability error.
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function CreateEventForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { movie: null, date: "", location: "", capacity: "", price: "" },
  });

  const mutation = useMutation({
    // Wrapped (not `mutationFn: eventsApi.create`) so react-query's mutationFnContext
    // second argument isn't forwarded to eventsApi.create.
    mutationFn: (input: CreateEventInput) => eventsApi.create(input),
    onSuccess: () => router.push("/organizador/eventos"),
    onError: (error) => showToast(getErrorMessage(error)),
  });

  const onValid = (values: FormOutput) =>
    mutation.mutate({
      tmdbId: values.movie.tmdbId,
      date: values.date,
      location: values.location,
      capacity: values.capacity,
      price: values.price,
    });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onValid)}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 420 }}
    >
      <Controller
        name="movie"
        control={control}
        render={({ field }) => <MoviePicker value={field.value} onChange={field.onChange} />}
      />
      {errors.movie ? <span>{errors.movie.message as string}</span> : null}

      <TextField
        label="Data e hora"
        type="datetime-local"
        slotProps={{ inputLabel: { shrink: true } }}
        error={!!errors.date}
        helperText={errors.date?.message}
        {...register("date")}
      />
      <TextField
        label="Local"
        error={!!errors.location}
        helperText={errors.location?.message}
        {...register("location")}
      />
      <TextField
        label="Capacidade"
        type="number"
        error={!!errors.capacity}
        helperText={errors.capacity?.message}
        {...register("capacity")}
      />
      <TextField
        label="Preço"
        placeholder="39.90"
        error={!!errors.price}
        helperText={errors.price?.message}
        {...register("price")}
      />
      <Button type="submit" variant="contained" disabled={mutation.isPending}>
        Publicar evento
      </Button>
    </Box>
  );
}
