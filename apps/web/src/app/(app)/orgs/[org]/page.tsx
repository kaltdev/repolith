import { redirect } from "next/navigation";

export default async function OrgDetailPage({ params }: { params: Promise<{ org: string }> }) {
	const { org } = await params;
	redirect(`/${org}`);
}
