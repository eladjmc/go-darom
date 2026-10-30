import { Bell, Home, Menu, MessageCircle, ShoppingBag, Users, X, type LucideIcon } from "lucide-react";
import { APP_ICONS, type AppIconName } from "./productIcons";
import "./app-icon.css";

const LUCIDE: Record<"home" | "community" | "shop" | "menu" | "close" | "messages" | "bell", LucideIcon> = {
  home: Home,
  community: Users,
  shop: ShoppingBag,
  menu: Menu,
  close: X,
  messages: MessageCircle,
  bell: Bell,
};

type Props = {
  name: AppIconName;
  size?: number;
  className?: string;
};

/** Decorative product/chrome icon. Adjacent text supplies the accessible name. */
export function AppIcon({ name, size = 18, className = "" }: Props) {
  const def = APP_ICONS[name];
  const classes = ["app-icon", `app-icon--${def.kind}`, className].filter(Boolean).join(" ");

  if (def.kind === "brand") {
    return (
      <img
        className={classes}
        src={def.src}
        alt=""
        width={size}
        height={size}
        decoding="async"
        aria-hidden="true"
      />
    );
  }

  const Lucide = LUCIDE[def.name];
  return <Lucide className={classes} size={size} aria-hidden strokeWidth={1.85} />;
}
