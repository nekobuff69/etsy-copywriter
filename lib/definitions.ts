import {imageAnalysisSchema, copyWritingSchema} from "./schemas";
import {z} from "zod";

export type FileFormatInfo = {
	extension: string;
	mime: string;
};

export type ImageAnalysisType = z.infer<typeof imageAnalysisSchema>;

export type CopyWritingType = z.infer<typeof copyWritingSchema>;
