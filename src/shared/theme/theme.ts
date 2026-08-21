import { createTheme } from "@mui/material/styles";

/**
 * Identidade visual: "Sala escura".
 *
 * O produto é uma bilheteria de cinema, então a interface é a própria sala: fundo
 * de tinta azul-violeta (não preto neutro), pôster como imagem principal, e a luz
 * vindo de dois lugares que existem no domínio — as lâmpadas da marquise sobre a
 * bilheteria (âmbar) e a cortina do lobby (rosa). Nada mais brilha.
 *
 * Três papéis tipográficos, cada um com um significado:
 *   - display  (Barlow Condensed) → títulos, o grotesco condensado do bloco de
 *              créditos de um pôster e da sinalização de bilheteria;
 *   - corpo    (Geist)            → texto e formulários;
 *   - dados    (Geist Mono)       → tudo o que a máquina emitiu: assento, fileira,
 *              preço, contagem regressiva, código do ingresso.
 */

const sala = "#141120"; // a sala antes de apagarem as luzes
const poltrona = "#1e1a2e"; // o encosto da poltrona, um passo acima do escuro
const marquise = "#f2b544"; // filamento das lâmpadas da marquise
const cortina = "#e0577d"; // a cortina do lobby
const luz = "#f5f1e9"; // luz de tela num rosto, nunca branco puro
const poeira = "#a79fba"; // poeira no facho do projetor
const vinco = "#2c2640"; // divisórias

const corpo = "var(--font-geist-sans), system-ui, -apple-system, Arial, sans-serif";
const display = 'var(--font-display), "Arial Narrow", var(--font-geist-sans), sans-serif';
const dados = "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: marquise, light: "#f7cc79", dark: "#c98f26", contrastText: "#1a1206" },
    secondary: { main: cortina, light: "#ec85a0", dark: "#b23c5c", contrastText: "#20060e" },
    success: { main: "#4ecb8e", contrastText: "#04210f" },
    warning: { main: "#e8933f", contrastText: "#211202" },
    error: { main: "#ff6b6b", contrastText: "#2a0808" },
    info: { main: "#8fa9f5", contrastText: "#0a1128" },
    background: { default: sala, paper: poltrona },
    text: { primary: luz, secondary: poeira, disabled: "#6a6288" },
    divider: vinco,
    action: {
      hover: "rgba(242, 181, 68, 0.08)",
      selected: "rgba(242, 181, 68, 0.16)",
      disabled: "#6a6288",
      disabledBackground: "#241f35",
      focus: "rgba(242, 181, 68, 0.24)",
    },
  },

  typography: {
    fontFamily: corpo,
    h1: {
      fontFamily: display,
      fontWeight: 700,
      fontSize: "4rem",
      lineHeight: 1.02,
      letterSpacing: "-0.015em",
    },
    h2: {
      fontFamily: display,
      fontWeight: 700,
      fontSize: "3.25rem",
      lineHeight: 1.05,
      letterSpacing: "-0.012em",
    },
    h3: {
      fontFamily: display,
      fontWeight: 700,
      fontSize: "2.75rem",
      lineHeight: 1.08,
      letterSpacing: "-0.01em",
    },
    h4: {
      fontFamily: display,
      fontWeight: 700,
      fontSize: "2.25rem",
      lineHeight: 1.1,
      letterSpacing: "-0.01em",
    },
    h5: {
      fontFamily: display,
      fontWeight: 700,
      fontSize: "1.75rem",
      lineHeight: 1.15,
    },
    h6: {
      fontFamily: display,
      fontWeight: 700,
      fontSize: "1.375rem",
      lineHeight: 1.2,
    },
    subtitle1: {
      fontFamily: display,
      fontWeight: 600,
      fontSize: "1.125rem",
      lineHeight: 1.22,
    },
    subtitle2: {
      fontFamily: display,
      fontWeight: 600,
      fontSize: "1rem",
      lineHeight: 1.25,
    },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.55 },
    button: {
      fontFamily: corpo,
      fontWeight: 700,
      fontSize: "0.8125rem",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    overline: {
      fontFamily: dados,
      fontWeight: 600,
      fontSize: "0.6875rem",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
    },
  },

  shape: { borderRadius: 8 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: sala,
          // O facho da tela sangrando pra dentro da página: o mesmo gesto que o
          // mapa de assentos repete de perto.
          backgroundImage:
            "radial-gradient(120% 55% at 50% -12%, rgba(242, 181, 68, 0.07), rgba(242, 181, 68, 0) 62%)",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
          "&::selection": { backgroundColor: marquise, color: "#1a1206" },
        },
        "*::selection": { backgroundColor: marquise, color: "#1a1206" },
      },
    },

    // No escuro, a hierarquia vem de borda e matiz — não de sombra. Também mata o
    // gradiente de "elevation overlay" do MUI, que é a assinatura mais óbvia do tema padrão.
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: vinco },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${vinco}`,
          borderRadius: 12,
        },
      },
    },

    // Papelaria arredondada, controles retos: poltronas e teclas são retângulos duros.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 4, minHeight: 42, paddingInline: 18 },
        contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
        outlined: {
          borderColor: vinco,
          "&:hover": { borderColor: marquise, backgroundColor: "rgba(242, 181, 68, 0.08)" },
        },
        text: { "&:hover": { backgroundColor: "rgba(242, 181, 68, 0.08)" } },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 700,
          fontSize: "0.6875rem",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: "rgba(245, 241, 233, 0.02)",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: vinco },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#3d3557" },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { letterSpacing: "0.01em" },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, backgroundImage: "none", alignItems: "center" },
        message: { fontWeight: 500 },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: { borderColor: vinco },
      },
    },

    MuiLink: {
      styleOverrides: {
        root: { color: marquise, textDecorationColor: "rgba(242, 181, 68, 0.4)" },
      },
    },

    MuiSnackbarContent: {
      styleOverrides: {
        root: { backgroundColor: poltrona, color: luz, border: `1px solid ${vinco}` },
      },
    },
  },
});
