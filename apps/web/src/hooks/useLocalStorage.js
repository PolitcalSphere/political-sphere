import { useState } from "react";

export function useLocalStorage(key, initialValue) {
	const [state, setState] = useState(() => {
		try {
			if (typeof window === "undefined" || !window.localStorage)
				return initialValue;
			const raw = window.localStorage.getItem(key);
			return raw ? JSON.parse(raw) : initialValue;
		} catch (e) {
			return initialValue;
		}
	});

	const setValue = (value) => {
		try {
			setState(value);
			if (typeof window !== "undefined" && window.localStorage) {
				window.localStorage.setItem(key, JSON.stringify(value));
			}
		} catch (e) {
			// ignore
		}
	};

	return [state, setValue];
}

export default useLocalStorage;
