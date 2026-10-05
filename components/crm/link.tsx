import type { AnchorHTMLAttributes } from "react";
import { routeHref } from "../../lib/crm/transport";
// Full document navigation avoids relying on experimental RSC client routing.
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={routeHref(props.href)} />;
}
