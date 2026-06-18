/**
 * <route route="/(customer)/profile" role="customer">
 *   Thin binding to the shared <Profile/> screen (src/screens/Profile.tsx).
 *   expo-router needs a file per role tab; the screen itself is role-agnostic.
 * </route>
 */
import Profile from "@/src/screens/Profile";
export default Profile;
