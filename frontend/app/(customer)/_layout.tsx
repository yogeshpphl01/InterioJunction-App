/**
 * <layout group="(customer)" nav="bottom-tabs" role="customer">
 *   <tabs>Home (index) · Support (tickets) · Design AI (assistant) · Profile</tabs>
 * </layout>
 */
import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/src/theme";

export default function CustomerLayout() {
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
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="tickets" options={{ title: "Support", tabBarIcon: ({ color, size }) => <Feather name="life-buoy" size={size} color={color} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "Design AI", tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
    </Tabs>
  );
}
