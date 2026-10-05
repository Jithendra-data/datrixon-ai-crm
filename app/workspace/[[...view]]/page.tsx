import Workspace from "../../../components/crm/workspace";
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const { view } = await params;
  return <Workspace view={view?.[0] || "overview"} recordId={view?.[1]} />;
}
