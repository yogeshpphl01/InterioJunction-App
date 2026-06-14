import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // Service requests & complaints are reserved for onboarded clients, not guests.
  const isGuest = !!user?.is_guest;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.inkMute,
        tabBarStyle: {
          backgroundColor: C.surface2,
          borderTopColor: C.border,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: F.text, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }} />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Support",
          // Hidden for guests — only onboarded clients can raise service/complaints.
          href: isGuest ? null : undefined,
          tabBarIcon: ({ color, size }) => <Feather name="life-buoy" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="assistant" options={{ title: "Design AI", tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
      {/* Routable but not shown in the tab bar */}
      <Tabs.Screen name="start-project" options={{ href: null }} />
    </Tabs>
  );
}
