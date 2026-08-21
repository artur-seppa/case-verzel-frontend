"use client";

import { useRef } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { EventCard } from "./event-card";
import { EventSummary } from "../types";

const CARD_WIDTH = 340;
const CARD_GAP = 24;
const SCROLL_STEP = (CARD_WIDTH + CARD_GAP) * 2;

const arrowButtonSx = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 1,
  bgcolor: "background.paper",
  boxShadow: 3,
  "&:hover": { bgcolor: "background.paper" },
} as const;

export function EventsCarousel({ events }: { events: EventSummary[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      <IconButton
        aria-label="Eventos anteriores"
        onClick={() => scrollBy(-SCROLL_STEP)}
        sx={{ ...arrowButtonSx, left: 8 }}
      >
        <ChevronLeftIcon />
      </IconButton>

      <Box
        ref={scrollerRef}
        sx={{
          display: "flex",
          gap: `${CARD_GAP}px`,
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          py: 1,
          px: 5,
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {events.map((event) => (
          <Box
            key={event.id}
            sx={{ flex: "0 0 auto", width: CARD_WIDTH, scrollSnapAlign: "start" }}
          >
            <EventCard event={event} />
          </Box>
        ))}
      </Box>

      <IconButton
        aria-label="Próximos eventos"
        onClick={() => scrollBy(SCROLL_STEP)}
        sx={{ ...arrowButtonSx, right: 8 }}
      >
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}
