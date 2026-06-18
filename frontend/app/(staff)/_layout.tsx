/**
 * <layout group="(staff)" nav="bottom-tabs" role="admin|sales|factory">
 *   <tabs>Dashboard (index) · Projects · Tickets · Leads · Profile</tabs>
 * </layout>
 */
import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/src/theme";

export default function StaffLayout() {
  const insets = useSafeAreaInsets();
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
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} /> }} />
      <Tabs.Screen name="projects" options={{ title: "Projects", tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} /> }} />
      <Tabs.Screen name="tickets" options={{ title: "Tickets", tabBarIcon: ({ color, size }) => <Feather name="inbox" size={size} color={color} /> }} />
      <Tabs.Screen name="leads" options={{ title: "Leads", tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
    </Tabs>
  );
}
