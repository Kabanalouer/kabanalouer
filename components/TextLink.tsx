import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";

interface Props extends LinkProps {
  children: ReactNode;
  className?: string;
}

export default function TextLink({ className, children, ...linkProps }: Props) {
  return (
    <Link {...linkProps} className={className ? `${TEXT_LINK_CLASSNAME} ${className}` : TEXT_LINK_CLASSNAME}>
      {children}
    </Link>
  );
}
