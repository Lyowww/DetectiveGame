"use client";

import Image from "next/image";
import { useState } from "react";

export function Portrait({
  src,
  name,
  size = 56,
  className = "",
}: {
  src: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const letter = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span className={`portrait ${className}`} style={{ width: size, height: size }}>
      {!failed ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="portrait-fallback" role="img" aria-label={name}>{letter}</span>
      )}
    </span>
  );
}
