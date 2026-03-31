"use client";

// Prevents a single dashboard widget failure from breaking the full dashboard surface.

import type * as React from "react";
import { Button } from "@/components/ui/button";

interface WidgetErrorBoundaryProps {
	children: React.ReactNode;
	title: string;
}

interface WidgetErrorBoundaryState {
	hasError: boolean;
}

export class WidgetErrorBoundary extends React.Component<
	WidgetErrorBoundaryProps,
	WidgetErrorBoundaryState
> {
	override state: WidgetErrorBoundaryState = {
		hasError: false,
	};

	static getDerivedStateFromError(): WidgetErrorBoundaryState {
		return { hasError: true };
	}

	override componentDidUpdate(prevProps: WidgetErrorBoundaryProps): void {
		if (prevProps.title !== this.props.title && this.state.hasError) {
			this.setState({ hasError: false });
		}
	}

	override render() {
		if (!this.state.hasError) {
			return this.props.children;
		}

		return (
			<div className="rounded-md border border-border p-4">
				<p className="text-sm font-medium">{this.props.title}</p>
				<p className="mt-1 text-xs text-muted-foreground">
					This widget failed to load.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3"
					onClick={() => this.setState({ hasError: false })}
				>
					Try again
				</Button>
			</div>
		);
	}
}
