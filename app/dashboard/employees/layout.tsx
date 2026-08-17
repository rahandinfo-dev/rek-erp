import SubscriptionModuleGate from "@/components/subscriptions/SubscriptionModuleGate";
export default function Layout({ children }: { children: React.ReactNode }) { return <SubscriptionModuleGate>{children}</SubscriptionModuleGate>; }
