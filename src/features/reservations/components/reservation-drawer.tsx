"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { Seat, EventDetail } from "@/features/events/types";
import { reservationsApi } from "../api/reservations-api";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function ReservationDrawer({
  open,
  onClose,
  event,
  seat,
}: {
  open: boolean;
  onClose: () => void;
  event: EventDetail;
  seat: Seat;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const createMutation = useMutation({
    mutationFn: () => reservationsApi.create({ eventId: event.id, seatId: seat.id }),
    onSuccess: (reservation) => {
      onClose();
      router.push(`/checkout/${reservation.id}`);
    },
    onError: (error) => {
      showToast(
        getErrorMessage(error, { CONFLICT: "Esse assento acabou de ser reservado por outra pessoa." }),
      );
    },
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 420 }, p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" component="h2">
            Reservar ingresso
          </Typography>
          <IconButton onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6">{event.title}</Typography>
          <Typography color="text.secondary">
            {event.location} · Assento {seat.label}
          </Typography>
          <Typography variant="h6">{formatPrice(event.price)}</Typography>
          <Button
            variant="contained"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Confirmar reserva
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
