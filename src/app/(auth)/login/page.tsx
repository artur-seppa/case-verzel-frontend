import { Suspense } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Entrar
          </Typography>
          <Suspense>
            <LoginForm />
          </Suspense>
          <Typography variant="body2" sx={{ mt: 3 }}>
            Não tem conta? <Link href="/registro">Criar conta</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
