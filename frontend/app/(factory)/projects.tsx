/**
 * <route route="/(factory)/projects" role="factory">
 *   Read-only project list (no create button) using the shared ProjectsList.
 * </route>
 */
import React from "react";
import ProjectsList from "@/src/screens/ProjectsList";

export default function FactoryProjects() {
  return <ProjectsList title="Projects" subtitle="Production Queue" />;
}
