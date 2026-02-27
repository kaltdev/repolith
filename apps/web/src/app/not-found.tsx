"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-4">
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.03]"
				style={{
					backgroundImage:
						"linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
					backgroundSize: "60px 60px",
				}}
			/>

			<div
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
				style={{
					background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)",
				}}
			/>

			<div className="relative z-10 flex flex-col items-center text-center max-w-md">
				<Glitch404 />

				<div className="w-12 h-px bg-border my-6" />

				<p className="text-sm text-muted-foreground/70 leading-relaxed">
					This page doesn&apos;t exist, or you don&apos;t have
					<br className="hidden sm:block" /> permission to access it.
				</p>

				<div className="flex items-center gap-3 mt-8">
					<Link
						href="/dashboard"
						className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-xs font-mono font-medium rounded-md hover:bg-foreground/90 transition-colors"
					>
						Go home
					</Link>
					<button
						onClick={() => window.history.back()}
						className="flex items-center gap-2 px-4 py-2 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/20 rounded-md transition-colors cursor-pointer"
					>
						Go back
					</button>
				</div>

				<div className="mt-16">
					<Logo className="h-3 text-muted-foreground/20" />
				</div>
			</div>
		</div>
	);
}

function Glitch404() {
	const [glitch, setGlitch] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setTimeout>>(null);

	useEffect(() => {
		const triggerGlitch = () => {
			setGlitch(true);
			setTimeout(() => setGlitch(false), 150);
			intervalRef.current = setTimeout(
				triggerGlitch,
				3000 + Math.random() * 5000,
			);
		};
		intervalRef.current = setTimeout(triggerGlitch, 2000);
		return () => {
			if (intervalRef.current) clearTimeout(intervalRef.current);
		};
	}, []);

	return (
		<div className="relative select-none">
			{glitch && (
				<>
					<span
						className="absolute inset-0 font-mono text-[120px] sm:text-[160px] font-bold tracking-tighter text-foreground/10"
						style={{
							transform: "translate(-4px, -2px)",
							clipPath: "inset(20% 0 40% 0)",
						}}
						aria-hidden
					>
						404
					</span>
					<span
						className="absolute inset-0 font-mono text-[120px] sm:text-[160px] font-bold tracking-tighter text-foreground/10"
						style={{
							transform: "translate(4px, 2px)",
							clipPath: "inset(50% 0 10% 0)",
						}}
						aria-hidden
					>
						404
					</span>
				</>
			)}

			<h1
				className="font-mono text-[120px] sm:text-[160px] font-bold tracking-tighter leading-none text-foreground/[0.06]"
				style={glitch ? { transform: "translate(1px, -1px)" } : undefined}
			>
				404
			</h1>

			{glitch && (
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						backgroundImage:
							"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)",
					}}
				/>
			)}
		</div>
	);
}
