import { pipeline } from "@huggingface/transformers";

const audio = new Float32Array(16000).fill(0);
const transcriber = await pipeline(
	"automatic-speech-recognition",
	"onnx-community/whisper-small",
	{
		device: "cpu",
		dtype: { encoder_model: "fp32", decoder_model_merged: "q8" },
	},
);
const result = await transcriber(audio, {
	language: "en",
	return_timestamps: "word",
});
console.log("RESULT:", JSON.stringify(result));
