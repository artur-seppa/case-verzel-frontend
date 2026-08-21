"use client";

import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { CreateEventForm } from "./create-event-form";

export function CreateEventDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 420 }, p: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" component="h2">
            Novo evento
          </Typography>
          <IconButton aria-label="Fechar" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <CreateEventForm onSuccess={onClose} />
      </Box>
    </Drawer>
  );
}
