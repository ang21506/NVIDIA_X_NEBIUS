import { useEffect, useRef, useState } from "react";
interface RecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
export function useVoiceInput(onReady: (text: string, audio?: Blob) => void) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      recognition.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const start = async () => {
    setError("");
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Speech =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Speech) {
      setError(
        "Voice transcription is not available in this browser. Please type your question.",
      );
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!mounted.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      const chunks: Blob[] = [];
      let transcript = "";
      const r = new MediaRecorder(stream.current);
      recorder.current = r;
      const s = new Speech();
      recognition.current = s;
      s.continuous = true;
      s.interimResults = false;
      s.lang = "en-US";
      s.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++)
          if (e.results[i].isFinal)
            transcript += e.results[i][0].transcript + " ";
      };
      s.onerror = (e) => {
        if (mounted.current)
          setError(`Voice recognition: ${e.error}. You can type instead.`);
      };
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        if (mounted.current) {
          setRecording(false);
          if (transcript.trim())
            onReadyRef.current(
              transcript.trim(),
              new Blob(chunks, { type: r.mimeType || "audio/webm" }),
            );
          else
            setError(
              "No transcript was captured. Please type your question or try again.",
            );
        }
      };
      s.start();
      r.start();
      setRecording(true);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(e instanceof Error ? e.message : "Microphone unavailable.");
    }
  };
  const stop = () => {
    recognition.current?.stop();
    if (recorder.current?.state === "recording") recorder.current.stop();
  };
  return { recording, error, start, stop };
}
