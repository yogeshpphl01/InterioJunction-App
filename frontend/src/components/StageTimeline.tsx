import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { STAGES, stageIndex } from "@/src/constants";
import { Txt } from "@/src/components/ui";
import { C, S, FS } from "@/src/theme";

export default function StageTimeline({ current }: { current: string }) {
  const curIdx = stageIndex(current);
  return (
    <View style={styles.wrap}>
      {STAGES.map((s, i) => {
        const done = i < curIdx;
        const active = i === curIdx;
        const last = i === STAGES.length - 1;
        return (
          <View key={s.code} style={styles.row}>
            <View style={styles.railCol}>
              <View
                style={[
                  styles.dot,
                  done && { backgroundColor: C.success, borderColor: C.success },
                  active && { backgroundColor: C.ink, borderColor: C.ink },
                ]}
              >
                <Feather
                  name={done ? "check" : (s.icon as any)}
                  size={13}
                  color={done || active ? C.onBrand : C.inkMute}
                />
              </View>
              {!last && <View style={[styles.line, done && { backgroundColor: C.success }]} />}
            </View>
            <View style={[styles.label, last && { paddingBottom: 0 }]}>
              <Txt
                weight={active ? "bold" : "medium"}
                color={active ? C.ink : done ? C.inkSoft : C.inkMute}
                size={FS.lg}
              >
                {s.label}
              </Txt>
              <Txt size={FS.sm} color={active ? C.success : C.inkMute}>
                {active ? "In progress" : done ? "Completed" : "Pending"}
              </Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: S.xs },
  row: { flexDirection: "row" },
  railCol: { width: 36, alignItems: "center" },
  dot: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.borderStrong,
    backgroundColor: C.surface2, alignItems: "center", justifyContent: "center",
  },
  line: { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 2 },
  label: { flex: 1, paddingLeft: S.lg, paddingBottom: S.xl },
});
