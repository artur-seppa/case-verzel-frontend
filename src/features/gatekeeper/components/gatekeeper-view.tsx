"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { eventsApi } from "@/features/events/api/events-api";
import { ApiError } from "@/shared/api-client";
import { formatEventDate, isToday } from "@/shared/utils/format-date";
import { gatekeeperApi } from "../api/gatekeeper-api";
import { mapValidationOutcome } from "../lib/map-validation-outcome";
import { GatekeeperOutcome } from "../types";
import { ValidationResult } from "./validation-result";
import { Scanner } from "./scanner";

// The camera keeps decoding the same QR at ~10fps while it's in frame, so a scan
// handler with no guard would re-fire the mutation many times per second for one
// physical ticket. Ignore repeats of the same code while a request is in flight
// or shortly after it resolves, until the operator moves to a different ticket.
const SCAN_COOLDOWN_MS = 3000;

export function GatekeeperView() {
  const [eventId, setEventId] = useState("");
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<GatekeeperOutcome | null>(null);
  const lastScanRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: events } = useQuery({
    queryKey: ["events", "gatekeeper-list"],
    queryFn: () => eventsApi.list(1, 100),
  });
  const todaysEvents = (events?.data ?? []).filter((event) => isToday(event.date));

  const mutation = useMutation({
    mutationFn: (qrToken: string) => gatekeeperApi.validate(qrToken),
    onSuccess: (result) => setOutcome(mapValidationOutcome(eventId, result, null)),
    onError: (error) =>
      setOutcome(mapValidationOutcome(eventId, null, error instanceof ApiError ? error : null)),
  });

  const handleScan = useCallback(
    (decoded: string) => {
      if (mutation.isPending || decoded === lastScanRef.current) return;
      lastScanRef.current = decoded;
      if (scanCooldownRef.current) clearTimeout(scanCooldownRef.current);
      scanCooldownRef.current = setTimeout(() => {
        lastScanRef.current = null;
      }, SCAN_COOLDOWN_MS);
      mutation.mutate(decoded);
    },
    [mutation],
  );

  const selectedEvent = todaysEvents.find((event) => event.id === eventId);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, maxWidth: 480, mx: "auto" }}>
      {events && todaysEvents.length === 0 ? (
        <Typography color="text.secondary">Nenhum evento hoje.</Typography>
      ) : (
        <FormControl fullWidth>
          <InputLabel id="event-label" shrink>
            Evento
          </InputLabel>
          <Select
            fullWidth
            displayEmpty
            labelId="event-label"
            label="Evento"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            renderValue={() =>
              selectedEvent
                ? `${selectedEvent.title} — ${formatEventDate(selectedEvent.date)}`
                : "Selecione o evento"
            }
          >
            {todaysEvents.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                <Box sx={{ display: "flex", flexDirection: "column", py: 0.5 }}>
                  <span>{event.title}</span>
                  <Typography variant="caption" color="text.secondary">
                    {formatEventDate(event.date)} · {event.location}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {eventId ? (
        <>
          <Scanner onScan={handleScan} />
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
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
