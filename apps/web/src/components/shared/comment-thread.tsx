import { Comment } from "./comment";

interface ThreadComment {
	id: number;
	user: { login: string; avatar_url: string } | null;
	body?: string;
	created_at: string;
	author_association?: string;
}

export async function CommentThread({ comments }: { comments: ThreadComment[] }) {
	if (comments.length === 0) {
		return (
			<div className="py-8 text-center">
				<p className="text-xs text-muted-foreground/60 font-mono">
					No comments yet
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{comments.map((comment) => (
				<Comment
					key={comment.id}
					author={comment.user}
					body={comment.body || ""}
					createdAt={comment.created_at}
					association={comment.author_association}
				/>
			))}
		</div>
	);
}
