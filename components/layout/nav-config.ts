import {
  Activity,
  Building2,
  CalendarRange,
  Filter,
  MessageCircle,
  CreditCard,
  LayoutDashboard,
  Package,
  Repeat,
  LifeBuoy,
  Receipt,
  Settings,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Key into the badge counts passed to the shell. */
  badge?: "followUpsDue" | "queuedMessages" | "insideNow";
  /** Hidden from staff who are not the gym owner. */
  ownerOnly?: boolean;
  /** Behind the paywall — hidden once a gym's access window has run out. */
  workspaceOnly?: boolean;
};

export type NavGroup = { label: string | null; items: NavItem[] };

/**
 * The workspace navigation, in the order a gym actually works.
 *
 * Grouped rather than listed because the groups are the explanation: an owner
 * who has never seen this reads "Every day / Money / Grow / Your gym" and knows
 * where to look before they know what anything is called. Within each group the
 * order follows the workflow — a lead becomes a member, a member takes a
 * membership, a membership is paid for, and attendance is what says whether any
 * of it is working.
 *
 * Labels are the words a gym owner uses. "Subscriptions" is what our database
 * calls them; "Memberships" is what the person selling one calls them, and the
 * nav answers to them, not to us.
 */
export const GYM_NAV: NavGroup[] = [
  {
    label: "Every day",
    items: [
      { href: "/gym/dashboard", label: "Dashboard", icon: LayoutDashboard, workspaceOnly: true },
      { href: "/gym/clients", label: "Members", icon: Users, workspaceOnly: true },
      {
        href: "/gym/attendance",
        label: "Attendance",
        icon: Activity,
        badge: "insideNow",
        workspaceOnly: true,
      },
      { href: "/gym/classes", label: "Classes", icon: CalendarRange, workspaceOnly: true },
    ],
  },
  {
    label: "Money",
    items: [
      // The price list. Named for what it sells, not for what hangs off it —
      // workout and nutrition plans are attachments inside a membership, and
      // calling this "Programmes" made the shop look like a training library.
      { href: "/gym/plans", label: "Membership plans", icon: Package, workspaceOnly: true },
      { href: "/gym/subscriptions", label: "Memberships", icon: Repeat, workspaceOnly: true },
      { href: "/gym/payments", label: "Payments", icon: CreditCard, workspaceOnly: true },
    ],
  },
  {
    label: "Grow",
    items: [
      {
        href: "/gym/leads",
        label: "Enquiries",
        icon: Filter,
        badge: "followUpsDue",
        workspaceOnly: true,
      },
      {
        href: "/gym/messages",
        label: "Reminders",
        icon: MessageCircle,
        badge: "queuedMessages",
        workspaceOnly: true,
      },
    ],
  },
  {
    label: "Your gym",
    items: [
      { href: "/gym/staff", label: "Team", icon: UserCog, ownerOnly: true, workspaceOnly: true },
      { href: "/gym/settings", label: "Gym settings", icon: Settings },
      { href: "/gym/billing", label: "Plan & billing", icon: ShieldCheck, ownerOnly: true },
      // Marketing, not operations: the map pin and its click counts sit at the
      // bottom so they never compete with the work of running the gym.
      {
        href: "/gym/listing",
        label: "Map listing",
        icon: Building2,
        // Behind the paywall in `proxy.ts`, so it has to be behind it here too
        // — otherwise a lapsed gym is shown a link that bounces them straight
        // back to the renewal screen.
        workspaceOnly: true,
      },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/gyms", label: "Gyms", icon: Building2 },
      { href: "/admin/signups", label: "Signups", icon: UserPlus },
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/users", label: "People", icon: Users },
      { href: "/admin/revenue", label: "Revenue", icon: CreditCard },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/activity", label: "Activity", icon: Activity },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
    ],
  },
];
