export interface FileTreeNode {
	name: string;
	path: string;
	type: "file" | "dir";
	size?: number;
	children?: FileTreeNode[];
}

export function buildFileTree(
	flatItems: { path: string; type: string; size?: number }[],
): FileTreeNode[] {
	const root: FileTreeNode[] = [];
	const dirMap = new Map<string, FileTreeNode>();

	for (const item of flatItems) {
		if (item.type !== "blob" && item.type !== "tree") continue;

		const parts = item.path.split("/");
		const name = parts[parts.length - 1];
		const nodeType = item.type === "tree" ? "dir" : "file";

		const node: FileTreeNode = {
			name,
			path: item.path,
			type: nodeType,
			...(item.size !== undefined && nodeType === "file"
				? { size: item.size }
				: {}),
			...(nodeType === "dir" ? { children: [] } : {}),
		};

		if (nodeType === "dir") {
			dirMap.set(item.path, node);
		}

		if (parts.length === 1) {
			root.push(node);
		} else {
			const parentPath = parts.slice(0, -1).join("/");
			const parent = dirMap.get(parentPath);
			if (parent && parent.children) {
				parent.children.push(node);
			}
		}
	}

	const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
		nodes.sort((a, b) => {
			if (a.type === "dir" && b.type === "file") return -1;
			if (a.type === "file" && b.type === "dir") return 1;
			return a.name.localeCompare(b.name);
		});
		for (const node of nodes) {
			if (node.children) sortNodes(node.children);
		}
		return nodes;
	};

	return sortNodes(root);
}

export function getAncestorPaths(filePath: string): string[] {
	const parts = filePath.split("/");
	const ancestors: string[] = [];
	for (let i = 1; i < parts.length; i++) {
		ancestors.push(parts.slice(0, i).join("/"));
	}
	return ancestors;
}
