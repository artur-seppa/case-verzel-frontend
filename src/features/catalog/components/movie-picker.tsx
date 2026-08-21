"use client";

import { useQuery } from "@tanstack/react-query";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { catalogApi } from "../api/catalog-api";
import { CatalogMovie } from "../types";

export function MoviePicker({
  value,
  onChange,
}: {
  value: CatalogMovie | null;
  onChange: (movie: CatalogMovie | null) => void;
}) {
  const { data } = useQuery({
    queryKey: ["catalog", "now-playing"],
    queryFn: () => catalogApi.listNowPlaying(),
  });

  return (
    <Autocomplete
      options={data?.data ?? []}
      getOptionLabel={(movie) => movie.title}
      isOptionEqualToValue={(option, val) => option.tmdbId === val.tmdbId}
      value={value}
      onChange={(_, movie) => onChange(movie)}
      renderInput={(params) => <TextField {...params} label="Filme" />}
    />
  );
}
