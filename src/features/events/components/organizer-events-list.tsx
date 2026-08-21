"use client";

import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { eventsApi } from "../api/events-api";
import { EventsCarousel } from "./events-carousel";

export function OrganizerEventsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["events", "mine"],
    queryFn: () => eventsApi.listMine(1, 100),
  });

  if (isLoading || !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.data.length === 0) {
    return <Typography>Você ainda não publicou nenhum evento.</Typography>;
  }

  return <EventsCarousel events={data.data} />;
}
