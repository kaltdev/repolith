"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_click;
uniform vec2 u_clickPos;

vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
   -0.577350269189626,
    0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amp * snoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

float hash21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  float time = u_time;
  float t = time * 0.04;

  vec2 ap = vec2(uv.x * aspect, uv.y);

  // ═══ SHARED MOUSE WARP ═══
  vec2 scaledP = ap * 2.5;
  vec2 mUV = u_mouse;
  mUV.x *= aspect;
  mUV *= 2.5;
  vec2 mDiff = scaledP - mUV;
  float mDist = length(mDiff);
  vec2 warp = vec2(0.0);
  if (u_mouse.x > 0.0 && mDist < 0.5) {
    warp = normalize(mDiff) * smoothstep(0.5, 0.0, mDist) * 0.2;
  }
  if (u_click > 0.01) {
    vec2 cUV = u_clickPos;
    cUV.x *= aspect;
    cUV *= 2.5;
    vec2 cD = scaledP - cUV;
    float cDist = length(cD);
    warp += normalize(cD + 0.001) * sin(cDist * 12.0 - time * 8.0) * u_click * 0.4 * exp(-cDist * 2.0);
  }

  // ═══ NOISE LAYER ═══
  vec2 np = scaledP + warp;
  vec2 q = vec2(fbm(np + t * 0.3), fbm(np + vec2(5.2, 1.3) + t * 0.2));
  vec2 r = vec2(
    fbm(np + 4.0 * q + vec2(1.7, 9.2) + t * 0.15),
    fbm(np + 4.0 * q + vec2(8.3, 2.8) + t * 0.12)
  );
  float f = fbm(np + 4.0 * r);
  float noise = clamp(f*f*f + 0.6*f*f + 0.5*f, 0.0, 1.0) * 0.15;

  // ═══ CONTRIBUTION GRID ═══
  vec2 gp = ap;
  gp += vec2(snoise(ap * 3.0 + t), snoise(ap * 3.0 + t + 50.0)) * 0.004;
  gp += warp * 0.04;
  gp += vec2(t * 0.2, t * 0.12);

  float cellTotal = 0.025;
  vec2 cellId = floor(gp / cellTotal);
  vec2 cellUV = fract(gp / cellTotal);

  float pad = 0.10;
  float edge = 0.04;
  float inX = smoothstep(pad - edge, pad + edge, cellUV.x)
            * (1.0 - smoothstep(1.0 - pad - edge, 1.0 - pad + edge, cellUV.x));
  float inY = smoothstep(pad - edge, pad + edge, cellUV.y)
            * (1.0 - smoothstep(1.0 - pad - edge, 1.0 - pad + edge, cellUV.y));
  float inSquare = inX * inY;

  float hVal = hash21(cellId);
  float level = hVal < 0.35 ? 0.0 : (hVal - 0.35) / 0.65;
  level *= level;

  vec2 fp = uv - vec2(0.45, 0.55);
  float gFade = max(1.0 - smoothstep(0.15, 0.45, length(fp * vec2(1.3, 1.6))), 0.0);

  float gridReveal = smoothstep(0.5, 3.0, time);
  float grid = inSquare * level * gFade * gridReveal * 0.10;

  // ═══ COMPOSE ═══
  vec2 vc = uv - 0.5;
  float vignette = 1.0 - dot(vc, vc) * 0.3;

  float col = noise * vignette + grid;
  gl_FragColor = vec4(vec3(col), 1.0);
}`;

export function HalftoneBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const frameRef = useRef<number>(0);
	const mouseRef = useRef({ x: -1, y: -1 });
	const smoothMouseRef = useRef({ x: -1, y: -1 });
	const clickRef = useRef({ strength: 0, x: 0, y: 0 });

	useEffect(() => {
		const canvas = canvasRef.current;
		const wrapper = wrapperRef.current;
		if (!canvas || !wrapper) return;

		const gl = canvas.getContext("webgl", {
			alpha: false,
			antialias: false,
			preserveDrawingBuffer: false,
		});
		if (!gl) return;

		function createShader(type: number, source: string) {
			const shader = gl!.createShader(type)!;
			gl!.shaderSource(shader, source);
			gl!.compileShader(shader);
			return shader;
		}

		const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
		const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

		const program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.useProgram(program);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW,
		);

		const aPosition = gl.getAttribLocation(program, "a_position");
		gl.enableVertexAttribArray(aPosition);
		gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

		const uTime = gl.getUniformLocation(program, "u_time");
		const uResolution = gl.getUniformLocation(program, "u_resolution");
		const uMouse = gl.getUniformLocation(program, "u_mouse");
		const uClick = gl.getUniformLocation(program, "u_click");
		const uClickPos = gl.getUniformLocation(program, "u_clickPos");

		const startTime = performance.now();

		const resize = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const scale = 0.5 * dpr;
			canvas.width = canvas.offsetWidth * scale;
			canvas.height = canvas.offsetHeight * scale;
			gl.viewport(0, 0, canvas.width, canvas.height);
		};

		resize();
		window.addEventListener("resize", resize);

		const onMouseMove = (e: MouseEvent) => {
			const rect = wrapper.getBoundingClientRect();
			mouseRef.current.x = (e.clientX - rect.left) / rect.width;
			mouseRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
		};

		const onMouseLeave = () => {
			mouseRef.current.x = -1;
			mouseRef.current.y = -1;
		};

		const onClick = (e: MouseEvent) => {
			const rect = wrapper.getBoundingClientRect();
			clickRef.current.x = (e.clientX - rect.left) / rect.width;
			clickRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
			clickRef.current.strength = 1.0;
		};

		window.addEventListener("mousemove", onMouseMove, { passive: true });
		wrapper.addEventListener("mouseleave", onMouseLeave);
		wrapper.addEventListener("click", onClick);

		const draw = () => {
			const elapsed = (performance.now() - startTime) / 1000;

			const lerp = 0.08;
			const target = mouseRef.current;
			const smooth = smoothMouseRef.current;
			if (target.x < 0) {
				smooth.x += (target.x - smooth.x) * 0.02;
				smooth.y += (target.y - smooth.y) * 0.02;
			} else {
				smooth.x += (target.x - smooth.x) * lerp;
				smooth.y += (target.y - smooth.y) * lerp;
			}

			clickRef.current.strength *= 0.96;

			gl.uniform1f(uTime, elapsed);
			gl.uniform2f(uResolution, canvas.width, canvas.height);
			gl.uniform2f(uMouse, smooth.x, smooth.y);
			gl.uniform1f(uClick, clickRef.current.strength);
			gl.uniform2f(uClickPos, clickRef.current.x, clickRef.current.y);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			frameRef.current = requestAnimationFrame(draw);
		};

		frameRef.current = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(frameRef.current);
			window.removeEventListener("resize", resize);
			window.removeEventListener("mousemove", onMouseMove);
			wrapper.removeEventListener("mouseleave", onMouseLeave);
			wrapper.removeEventListener("click", onClick);
			gl.deleteProgram(program);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
			gl.deleteBuffer(buffer);
		};
	}, []);

	return (
		<div
			ref={wrapperRef}
			className="absolute inset-0 overflow-hidden"
			style={{ background: "var(--shader-bg)" }}
			aria-hidden="true"
		>
			<canvas
				ref={canvasRef}
				className="w-full h-full"
				style={{ filter: "var(--shader-filter)" }}
			/>
		</div>
	);
}
