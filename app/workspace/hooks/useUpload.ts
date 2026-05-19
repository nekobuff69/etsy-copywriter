import { useCallback, useRef, useState } from "react";
import { createThumbnail } from "@/lib/file-utils";
import { computeFileHash } from "@/lib/file-hash";

/**
 * useUpload — owns file selection, preview URL, thumbnail, image hash, and drop handlers.
 */
export function useUpload() {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
	const [imageHash, setImageHash] = useState<string | null>(null);
	const [userText, setUserText] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	/**
	 * Direct setter — used by session restoration to inject a stored thumbnail.
	 * Does not reset file, previewUrl, or imageHash.
	 */
	const setStoredThumbnail = useCallback((url: string | null) => {
		setThumbnailUrl(url);
	}, []);

	const deriveFromNewFile = useCallback((f: File | null) => {
		if (!f) {
			setPreviewUrl(null);
			setThumbnailUrl(null);
			setImageHash(null);
			return;
		}
		const url = URL.createObjectURL(f);
		setPreviewUrl(url);
		createThumbnail(f).then(setThumbnailUrl);
		// compute hash async — discard if file changed before hash resolves
		const thisFile = f;
		computeFileHash(f).then((hash) => {
			// Only set if it's still the same file object (or the only one set)
			if (thisFile) setImageHash(hash);
		});
		return () => URL.revokeObjectURL(url);
	}, []);

	const handleFile = useCallback(
		(f: File | null) => {
			setFile(f);
			deriveFromNewFile(f);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		[deriveFromNewFile],
	);

	const onDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const dropped = e.dataTransfer.files[0];
		if (dropped) handleFile(dropped);
	}, [handleFile]);

	const onFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			handleFile(e.target.files?.[0] ?? null);
		},
		[handleFile],
	);

	return {
		file,
		previewUrl,
		thumbnailUrl,
		imageHash,
		userText, setUserText,
		handleFile,
		setThumbnailUrl: setStoredThumbnail,
		onDrop,
		onFileInput,
		fileInputRef,
	};
}
