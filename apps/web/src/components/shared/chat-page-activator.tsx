"use client";

import { useEffect } from "react";
import { useGlobalChat, type ChatConfig } from "@/components/shared/global-chat-provider";

interface ChatPageActivatorProps {
	config: ChatConfig;
}

export function ChatPageActivator({ config }: ChatPageActivatorProps) {
	const { setContext, clearContext } = useGlobalChat();

	useEffect(() => {
		setContext(config);
		return () => {
			clearContext();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config.contextKey]);

	return null;
}
