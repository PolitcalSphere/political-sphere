/**
 * Safe assign utilities
 * Provides a small helper to copy only whitelisted keys from an untrusted
 * source object into a target object. This prevents mass-assignment issues
 * when merging user-controlled data into application objects.
 */

export function pick(source = {}, allowed = []) {
	const out = {};
	if (!source || typeof source !== "object") return out;
	for (const key of allowed) {
		if (Object.hasOwn(source, key)) {
			out[key] = source[key];
		}
	}
	return out;
}

export function safeAssign(target = {}, source = {}, allowed = []) {
	if (!target || typeof target !== "object") return target;
	const safe = pick(source, allowed);
	return Object.assign(target, safe);
}

export default { pick, safeAssign };
