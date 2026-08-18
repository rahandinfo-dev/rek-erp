import { getCurrentUser } from "@/lib/auth/current-user";
import NavigationStyleSettings from "@/components/settings/NavigationStyleSettings";
import { DEFAULT_NAVIGATION_STYLE, isNavigationStyle } from "@/lib/navigation/styles";

export default async function NavigationStylePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <NavigationStyleSettings initialStyle={isNavigationStyle(user.navigationStyle) ? user.navigationStyle : DEFAULT_NAVIGATION_STYLE} />;
}
