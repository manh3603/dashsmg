"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

const LOGO_SRC = "/logo-omg.png";

type BrandLogoProps = {
  size?: number;
  className?: string;
  href?: string;
  /** Bo tròn góc logo (mặc định bật). */
  rounded?: boolean;
  /** Hiển thị tên thương hiệu bên cạnh logo. */
  showName?: boolean;
  nameClassName?: string;
};

export default function BrandLogo({
  size = 32,
  className = "",
  href,
  rounded = true,
  showName = false,
  nameClassName = "",
}: BrandLogoProps) {
  const roundClass = rounded ? "rounded-xl overflow-hidden" : "";
  const img = (
    <Image
      src={LOGO_SRC}
      alt={BRAND_NAME}
      width={size}
      height={size}
      className={`object-contain ${roundClass} ${className}`.trim()}
      priority
    />
  );

  const content = showName ? (
    <span className="inline-flex items-center gap-2">
      {img}
      <span className={nameClassName}>{BRAND_NAME}</span>
    </span>
  ) : (
    img
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {content}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center">{content}</span>;
}
