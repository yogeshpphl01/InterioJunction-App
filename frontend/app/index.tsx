/**
 * <screen route="/" name="Index" access="gate">
 *   <purpose>
 *     Auth/role gate. While auth boots, show a spinner; then redirect to
 *     /login (no user) or the role's tab group ((customer)/(factory)/(staff)).
 *   </purpose>
 * </screen>
 */
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/auth";
import { C } from "@/src/theme";

export default function Index() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.ink} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (user.role === "customer") return <Redirect href="/(customer)" />;
  if (user.role === "factory") return <Redirect href="/(factory)" />;
  return <Redirect href="/(staff)" />;
}
