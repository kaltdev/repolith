import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function DebugPage() {
	const reqHeaders = await headers();

	let session = null;
	let error: Error | null = null;

	try {
		session = await auth.api.getSession({ headers: reqHeaders });
	} catch (e) {
		error = e instanceof Error ? e : new Error(String(e));
	}

	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-4">Debug Info</h1>

			<div className="mb-4">
				<h2 className="text-lg font-semibold">Session:</h2>
				<pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
					{JSON.stringify(session, null, 2)}
				</pre>
			</div>

			{error && (
				<div className="mb-4">
					<h2 className="text-lg font-semibold text-red-600">
						Error:
					</h2>
					<pre className="bg-red-100 p-2 rounded text-sm overflow-auto">
						{error.toString()}
					</pre>
				</div>
			)}

			<div className="mb-4">
				<h2 className="text-lg font-semibold">Environment:</h2>
				<ul className="list-disc list-inside">
					<li>
						BETTER_AUTH_URL:{" "}
						{process.env.BETTER_AUTH_URL || "Not set"}
					</li>
					<li>
						NEXTAUTH_URL:{" "}
						{process.env.NEXTAUTH_URL || "Not set"}
					</li>
					<li>NODE_ENV: {process.env.NODE_ENV}</li>
				</ul>
			</div>
		</div>
	);
}
