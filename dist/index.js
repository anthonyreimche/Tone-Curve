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
		"exact",
		"lightroom"
	],
	fields: [{
		key: r,
		label: "Show point values",
		hint: "Show In and Out boxes under the curve for the selected point, in 0–255 levels like Lightroom, to read or type exact values.",
		type: "boolean",
		default: !1
	}]
};
//#endregion
//#region src/curve.ts
function f(e) {
	let t = [...e].sort((e, t) => e.x - t.x), n = t.length;
	if (n === 0) return (e) => e;
	if (n === 1) return () => h(t[0].y);
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
		if (e <= r[0]) return h(i[0]);
		if (e >= r[n - 1]) return h(i[n - 1]);
		let t = 0;
		for (; t < n - 1 && e > r[t + 1];) t++;
		let a = r[t + 1] - r[t], s = (e - r[t]) / a, c = s * s, l = c * s, u = 2 * l - 3 * c + 1, d = l - 2 * c + s, f = -2 * l + 3 * c, p = l - c;
		return h(u * i[t] + d * a * o[t] + f * i[t + 1] + p * a * o[t + 1]);
	};
}
function p(e) {
	let t = f(e.rgb), n = f(e.red), r = f(e.green), i = f(e.blue), a = /* @__PURE__ */ new Uint8Array(1024);
	for (let e = 0; e < 256; e++) {
		let o = t(e / 255);
		a[e * 4] = Math.round(n(o) * 255), a[e * 4 + 1] = Math.round(r(o) * 255), a[e * 4 + 2] = Math.round(i(o) * 255), a[e * 4 + 3] = 255;
	}
	return a;
}
function m(e) {
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
function h(e) {
	return e < 0 ? 0 : e > 1 ? 1 : e;
}
//#endregion
//#region src/stages.ts
var g = "safelight.tone-curve.curve", _ = "vec3 applyToneCurve(vec3 c) {\n  c = clamp(c, 0.0, 1.0);\n  // Per-channel LUTs packed into RGBA (master curve already composed in).\n  c.r = texture(uCurve, vec2(c.r, 0.5)).r;\n  c.g = texture(uCurve, vec2(c.g, 0.5)).g;\n  c.b = texture(uCurve, vec2(c.b, 0.5)).b;\n  return c;\n}", v = 0, y = ({ toneCurve: e }) => ({ uCurve: {
	data: p(e),
	width: 256,
	height: 1,
	format: "rgba8",
	version: ++v
} });
function b(e) {
	let t = {
		id: g,
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
		helpers: _,
		uniforms: [],
		derive: y
	} : {
		...t,
		glsl: "if (uCurveActive) c = applyToneCurve(c);",
		helpers: _,
		uniforms: [{
			key: "uCurveActive",
			glslType: "bool",
			default: !1
		}],
		derive: (e, t) => ({
			...y(e, t),
			uCurveActive: !m(e.toneCurve)
		})
	};
}
//#endregion
//#region src/index.tsx
var x = "core.tone-curve", S = 3;
function C(e) {
	n(e), e.registerProcessingStage(b(3)), e.registerPanel({
		id: x,
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
export { S as LINE, x as PANEL_ID, C as activate };

//# sourceMappingURL=index.js.map