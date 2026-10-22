import { redirect } from "next/navigation";

/**
 * `/editor` has no project id, so there is nothing to open here. The
 * projects page used to deep-link to `/editor?dialog=templates`, which
 * 404'd because no index route existed. Redirect to the projects list
 * instead of leaving that entry point broken.
 *
 * The templates gallery itself lives in `/editor/[project_id]` and needs
 * an active project, so it cannot be opened from a project-less URL.
 */
export default function EditorIndexPage(): never {
	redirect("/projects");
}
