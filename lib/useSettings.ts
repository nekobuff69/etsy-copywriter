import {useCallback, useState, useSyncExternalStore} from "react";
import {getStoredSettings, saveStoredSettings, type AppSettings} from "./settings";

function getServerSnapshot() {
	return false;
}

function getClientSnapshot() {
	return true;
}

function subscribe() {
	return () => {};
}

export function useSettings() {
	const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());
	const loaded = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

	const updateSettings = useCallback((next: AppSettings) => {
		saveStoredSettings(next);
		setSettings(next);
	}, []);

	return {settings, updateSettings, loaded};
}
