import Alert from "@mui/material/Alert";
import { GatekeeperOutcome } from "../types";

export function ValidationResult({ outcome }: { outcome: GatekeeperOutcome }) {
  if (outcome.kind === "valid") {
    return (
      <Alert severity="success">Ingresso válido — assento {outcome.result.seat.label}</Alert>
    );
  }
  if (outcome.kind === "wrong_event") {
    return (
      <Alert severity="warning">
        Evento errado: este ingresso é de &quot;{outcome.result.event.title}&quot;. Ele já foi
        marcado como utilizado — negue a entrada.
      </Alert>
    );
  }
  if (outcome.kind === "already_used") {
    return <Alert severity="error">Este ingresso já foi utilizado.</Alert>;
  }
  return <Alert severity="error">Ingresso inválido.</Alert>;
}
