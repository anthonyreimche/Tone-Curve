//#region src/rt.ts
var e, t;
function n(n) {
	t = n, e = n.react;
}
//#endregion
//#region src/ToneCurvePanel.tsx
var r = "showPointValues", i = [{
	x: 0,
	y: 0
}, {
	x: 1,
	y: 1
}], a = {
	rgb: i,
	red: i,
	green: i,
	blue: i
};
function o() {
	let n = () => t.settings.get(r, !1), [i, a] = e.useState(n);
	return e.useEffect(() => t.settings.onChange(() => a(n())), []), i;
}
function s() {
	let { Panel: n } = t.components;
	return /* @__PURE__ */ e.createElement(n, { title: "Tone Curve" }, /* @__PURE__ */ e.createElement(c, null));
}
function c() {
	let { CurveEditor: n } = t.components, r = t.stores.useDevelopStore, i = r((e) => e.params.toneCurve), a = r((e) => e.setToneCurve), s = r((e) => e.commitEdit), c = o();
	return /* @__PURE__ */ e.createElement(n, {
		curves: i,
		onChange: a,
		onCommit: () => void s("Tone Curve"),
		showPointValues: c
	});
}
function l() {
	let { CurveEditor: n } = t.components, r = t.develop.useMaskScope(), i = r.toneCurve ?? a, s = o();
	return /* @__PURE__ */ e.createElement(n, {
		compact: !0,
		curves: i,
		onChange: (e, t) => r.setToneCurve({
			...i,
			[e]: t
		}),
		onCommit: () => r.commit("Mask Tone Curve"),
		showPointValues: s
	});
}
var u = {
	component: l,
	order: 30,
	owns: ["toneCurve"]
}, d = {
	title: "Tone Curve",
	order: 50,
	keywords: [
		"curve",
		"point",
		"input",
		"output",
		"levels",
		"numbers",
		"exact"
	],
	fields: [{
		key: r,
		label: "Show point values",
		hint: "Show In and Out boxes under the curve for the selected point, in 0–255 levels, to read or type exact values.",
		type: "boolean",
		default: !1
	}]
};
//#endregion
//#region src/curve.ts
function f(e) {
	let t = [...e].sort((e, t) => e.x - t.x), n = t.length;
	if (n === 0) return (e) => e;
	if (n === 1) return () => _(t[0].y);
	let r = t.map((e) => e.x), i = t.map((e) => e.y), a = [];
	for (let e = 0; e < n - 1; e++) {
		let t = r[e + 1] - r[e];
		a.push(t === 0 ? 0 : (i[e + 1] - i[e]) / t);
	}
	let o = Array(n);
	o[0] = a[0], o[n - 1] = a[n - 2];
	for (let e = 1; e < n - 1; e++) o[e] = a[e - 1] * a[e] <= 0 ? 0 : (a[e - 1] + a[e]) / 2;
	for (let e = 0; e < n - 1; e++) {
		if (a[e] === 0) {
			o[e] = 0, o[e + 1] = 0;
			continue;
		}
		let t = o[e] / a[e], n = o[e + 1] / a[e], r = t * t + n * n;
		if (r > 9) {
			let i = 3 / Math.sqrt(r);
			o[e] = i * t * a[e], o[e + 1] = i * n * a[e];
		}
	}
	return (e) => {
		if (e <= r[0]) return _(i[0]);
		if (e >= r[n - 1]) return _(i[n - 1]);
		let t = 0;
		for (; t < n - 1 && e > r[t + 1];) t++;
		let a = r[t + 1] - r[t], s = (e - r[t]) / a, c = s * s, l = c * s, u = 2 * l - 3 * c + 1, d = l - 2 * c + s, f = -2 * l + 3 * c, p = l - c;
		return _(u * i[t] + d * a * o[t] + f * i[t + 1] + p * a * o[t + 1]);
	};
}
function p(e, t) {
	let n = f(e.rgb), r = f(e.red), i = f(e.green), a = f(e.blue);
	for (let e = 0; e < 256; e++) {
		let o = n(e / 255);
		t(e, r(o), i(o), a(o));
	}
}
function m(e) {
	let t = /* @__PURE__ */ new Uint8Array(1024);
	return p(e, (e, n, r, i) => {
		t[e * 4] = Math.round(n * 255), t[e * 4 + 1] = Math.round(r * 255), t[e * 4 + 2] = Math.round(i * 255), t[e * 4 + 3] = 255;
	}), t;
}
function h(e) {
	let t = /* @__PURE__ */ new Float32Array(1024);
	return p(e, (e, n, r, i) => {
		t[e * 4] = n, t[e * 4 + 1] = r, t[e * 4 + 2] = i, t[e * 4 + 3] = 1;
	}), t;
}
function g(e) {
	return [
		"rgb",
		"red",
		"green",
		"blue"
	].every((t) => {
		let n = e[t];
		return n.length === 2 && n[0].x === 0 && n[0].y === 0 && n[1].x === 1 && n[1].y === 1;
	});
}
function _(e) {
	return e < 0 ? 0 : e > 1 ? 1 : e;
}
//#endregion
//#region src/stages.ts
var v = "safelight.tone-curve.curve", y = "vec3 applyToneCurve(vec3 c) {\n  c = clamp(c, 0.0, 1.0);\n  // Per-channel LUTs packed into RGBA (master curve already composed in).\n  c.r = texture(uCurve, vec2(c.r, 0.5)).r;\n  c.g = texture(uCurve, vec2(c.g, 0.5)).g;\n  c.b = texture(uCurve, vec2(c.b, 0.5)).b;\n  return c;\n}", b = "vec3 applyToneCurve(vec3 c) {\n#if SL_PROCESS_VERSION >= 2\n  vec3 s = clamp(c, 0.0, 1.0);\n  vec3 t = vec3(texture(uCurve, vec2(s.r, 0.5)).r, texture(uCurve, vec2(s.g, 0.5)).g, texture(uCurve, vec2(s.b, 0.5)).b);\n  return t + (c - s);\n#else\n  c = clamp(c, 0.0, 1.0);\n  // Per-channel LUTs packed into RGBA (master curve already composed in).\n  c.r = texture(uCurve, vec2(c.r, 0.5)).r;\n  c.g = texture(uCurve, vec2(c.g, 0.5)).g;\n  c.b = texture(uCurve, vec2(c.b, 0.5)).b;\n  return c;\n#endif\n}", x = 0, S = ({ toneCurve: e }) => ({ uCurve: {
	data: m(e),
	width: 256,
	height: 1,
	format: "rgba8",
	version: ++x
} }), C = (e, t) => e.processVersion >= 2 ? { uCurve: {
	data: h(e.toneCurve),
	width: 256,
	height: 1,
	format: "rgba16f",
	version: ++x
} } : S(e, t);
function w(e) {
	let t = {
		id: v,
		name: "Tone Curve",
		phase: "display-adjust",
		anchor: "tone-curve",
		textures: [{
			key: "uCurve",
			kind: "photo"
		}]
	};
	return e === 1 ? {
		...t,
		glsl: "c = applyToneCurve(c);",
		helpers: y,
		uniforms: [],
		derive: S
	} : {
		...t,
		glsl: "if (uCurveActive) c = applyToneCurve(c);",
		helpers: b,
		uniforms: [{
			key: "uCurveActive",
			glslType: "bool",
			default: !1
		}],
		derive: (e, t) => ({
			...C(e, t),
			uCurveActive: !g(e.toneCurve)
		})
	};
}
//#endregion
//#region src/index.tsx
var T = "core.tone-curve", E = 3;
function D(e) {
	n(e), e.registerProcessingStage(w(3)), e.registerPanel({
		id: T,
		title: "Tone Curve",
		component: s,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: 6,
			width: 280,
			height: 220
		},
		onReset: () => void e.stores.useDevelopStore.getState().resetParams(["toneCurve"], "Reset Tone Curve"),
		mask: u
	}), e.registerSettings(d);
}
//#endregion
export { E as LINE, T as PANEL_ID, D as activate };

//# sourceMappingURL=index.js.map