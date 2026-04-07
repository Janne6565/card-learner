"use client";

import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

interface QrCodeProps {
  url: string;
  size?: number;
}

export default function QrCode({ url, size = 256 }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCodeLib.toDataURL(url, {
      width: size,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }).then(setDataUrl);
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        className="bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div className="inline-block rounded-xl overflow-hidden shadow-lg">
      <img src={dataUrl} alt="QR Code" width={size} height={size} />
    </div>
  );
}
