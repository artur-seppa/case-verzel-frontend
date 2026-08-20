import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Entrar
      </Typography>
      <LoginForm />
    </Box>
  );
}
