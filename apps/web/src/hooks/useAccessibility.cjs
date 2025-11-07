// CommonJS test shim for useAccessibility so tests that call `require('../../hooks/useAccessibility')`
// can resolve a module without depending on ESM import resolution.
module.exports = {
	useAccessibility: () => {
		const noop = () => {};
		return {
			announce: noop,
			trapFocus: () => noop,
			reducedMotion: false,
			focusNextElement: noop,
			focusPreviousElement: noop,
			highContrast: false,
			largeText: false,
			skipLinksVisible: false,
			skipToContent: noop,
			skipToNavigation: noop,
		};
	},
};
