"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const CONTAINER_ID = "gatekeeper-scanner";

export function Scanner({ onScan }: { onScan: (decodedText: string) => void }) {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const scanner = new Html5Qrcode(CONTAINER_ID);
    let unmounted = false;

    function stopAndClear() {
      if (scanner.isScanning) {
        scanner.stop().catch(() => undefined).finally(() => scanner.clear());
      } else {
        scanner.clear();
      }
    }

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => onScanRef.current(decodedText),
        undefined,
      )
      .then(() => {
        if (unmounted) stopAndClear();
      })
      .catch(() => {
        // Câmera indisponível (permissão negada, sem hardware, etc.) — a entrada manual continua funcionando.
      });

    return () => {
      unmounted = true;
      stopAndClear();
    };
  }, []);

  return <div id={CONTAINER_ID} style={{ width: "100%", maxWidth: 360, margin: "0 auto" }} />;
}
