export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

export interface ThumbnailOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
}

export function createThumbnail(file: File, options: ThumbnailOptions = {}): Promise<string> {
	const {maxWidth = 200, maxHeight = 200, quality = 0.7} = options;

	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);

			let {width, height} = img;
			if (width > maxWidth) {
				height = (height * maxWidth) / width;
				width = maxWidth;
			}
			if (height > maxHeight) {
				width = (width * maxHeight) / height;
				height = maxHeight;
			}

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}
			ctx.drawImage(img, 0, 0, width, height);
			resolve(canvas.toDataURL("image/jpeg", quality));
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image for thumbnail"));
		};

		img.src = url;
	});
}
