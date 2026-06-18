/**
 * <route route="/(staff)/projects" role="admin|sales">
 *   Project list WITH create (showCreate) using the shared ProjectsList.
 * </route>
 */
import React from "react";
import ProjectsList from "@/src/screens/ProjectsList";

export default function StaffProjects() {
  return <ProjectsList showCreate title="Projects" subtitle="All Orders" />;
}
