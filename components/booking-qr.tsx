"use client";
import { useEffect, useState } from "react";

export function BookingQr({ reservation, code, label }: { reservation: string; code: string; label: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    void import("qrcode").then((QRCode) => QRCode.toDataURL(`DAWA:${reservation}:${code}`, { width: 224, margin: 2, errorCorrectionLevel: "M", color: { dark: "#112e49", light: "#ffffff" } })).then((result) => { if (active) setUrl(result); }).catch(() => setUrl(""));
    return () => { active = false; };
  }, [reservation, code]);
  return url ? <img className="booking-qr" src={url} alt={label} width="224" height="224" /> : <span className="muted" role="status">{label}</span>;
}
