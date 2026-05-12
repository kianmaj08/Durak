"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRCodeDisplay({ value, size = 200 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#0e0d09", light: "#edeae2" },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-ink-100 rounded-lg animate-pulse"
      />
    );
  }
  return (
    <img
      src={dataUrl}
      alt="QR-Code zum Beitritt"
      width={size}
      height={size}
      className="rounded-lg"
    />
  );
}
