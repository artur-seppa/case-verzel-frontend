import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Criar conta
      </Typography>
      <RegisterForm />
    </Box>
  );
}
