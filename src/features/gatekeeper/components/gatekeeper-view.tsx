"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { eventsApi } from "@/features/events/api/events-api";
import { ApiError } from "@/shared/api-client";
import { gatekeeperApi } from "../api/gatekeeper-api";
import { mapValidationOutcome } from "../lib/map-validation-outcome";
import { GatekeeperOutcome } from "../types";
import { ValidationResult } from "./validation-result";
import { Scanner } from "./scanner";

export function GatekeeperView() {
  const [eventId, setEventId] = useState("");
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<GatekeeperOutcome | null>(null);

  const { data: events } = useQuery({
    queryKey: ["events", "gatekeeper-list"],
    queryFn: () => eventsApi.list(),
  });

  const mutation = useMutation({
    mutationFn: (qrToken: string) => gatekeeperApi.validate(qrToken),
    onSuccess: (result) => setOutcome(mapValidationOutcome(eventId, result, null)),
    onError: (error) =>
      setOutcome(mapValidationOutcome(eventId, null, error instanceof ApiError ? error : null)),
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 480 }}>
      <FormControl>
        <InputLabel id="event-label">Evento</InputLabel>
        <Select
          labelId="event-label"
          label="Evento"
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
        >
          {(events?.data ?? []).map((event) => (
            <MenuItem key={event.id} value={event.id}>
              {event.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {eventId ? (
        <>
          <Scanner onScan={(decoded) => mutation.mutate(decoded)} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Código do ingresso"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button variant="contained" onClick={() => mutation.mutate(code)} disabled={!code}>
              Validar
            </Button>
          </Box>
        </>
      ) : null}

      {outcome ? <ValidationResult outcome={outcome} /> : null}
    </Box>
  );
}
