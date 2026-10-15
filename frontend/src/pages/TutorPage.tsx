import React, { useState, useEffect, useRef } from 'react';
import { api, TutorAnswer, AudioConversation, AudioMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  History,
  RotateCcw,
  Sparkles,
  Radio,
  Send,
  Zap,
} from 'lucide-react';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  transcript: string;
  speechText?: string;
  audioUrl?: string;
  citations?: any[];
  timestamp: string;
  isSpeaking?: boolean;
}

export const TutorPage: React.FC = () => {
  const { activeCourseId } = useAuth();
  const [conversations, setConversations] = useState<AudioConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [statusText, setStatusText] = useState('J.A.R.V.I.S. Standby • Ready for voice command');
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);

  // Load past audio conversations
  const loadConversations = async () => {
    if (!activeCourseId) return;
    try {
      const list = await api.tutor.listVoiceConversations(activeCourseId);
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        loadConversationMessages(list[0].id);
      } else if (list.length === 0) {
        startNewConversation();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversationMessages = async (convId: string) => {
    setActiveConvId(convId);
    try {
      const detail = await api.tutor.getVoiceConversation(convId);
      const displayMsgs: DisplayMessage[] = detail.messages.map((m) => ({
        id: m.id,
        role: m.role,
        transcript: m.transcript,
        audioUrl: m.audio_url,
        citations: m.citations,
        timestamp: new Date(m.created_at).toLocaleTimeString(),
      }));
      setMessages(displayMsgs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [activeCourseId]);

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([
      {
        id: 'init',
        role: 'assistant',
        transcript: "At your service, Sir. J.A.R.V.I.S. voice systems are online and calibrated to your course materials. Speak or ask whenever you are ready.",
        speechText: "At your service, Sir. Voice systems online.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setStatusText('New Session • Press microphone to speak');
  };

  // Text-to-Speech (J.A.R.V.I.S. Persona)
  const speakAsJarvis = (text: string, msgId?: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const cleanText = text
      .replace(/[*#_`>]/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/Page \d+/gi, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 0.95; // Slightly lower, authoritative pitch

    // Prefer British English voice for authentic J.A.R.V.I.S. flavor
    const voices = synthRef.current.getVoices();
    const jarvisVoice = voices.find(
      (v) =>
        v.lang.includes('en-GB') ||
        v.name.toLowerCase().includes('uk') ||
        v.name.toLowerCase().includes('british') ||
        v.name.toLowerCase().includes('george')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (jarvisVoice) utterance.voice = jarvisVoice;

    utterance.onstart = () => {
      setIsJarvisSpeaking(true);
      setStatusText('J.A.R.V.I.S. Speaking...');
    };

    utterance.onend = () => {
      setIsJarvisSpeaking(false);
      setStatusText('J.A.R.V.I.S. Standby • Listening');
    };

    utterance.onerror = () => {
      setIsJarvisSpeaking(false);
      setStatusText('J.A.R.V.I.S. Standby');
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsJarvisSpeaking(false);
      setStatusText('J.A.R.V.I.S. Standby');
    }
  };

  // Audio Recording (Microphone Input)
  const startRecording = async () => {
    stopSpeaking();
    transcriptRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const finalTranscript = transcriptRef.current.trim() || textInput.trim();
        await processVoiceQuery(finalTranscript, audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      // Real-time browser speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcriptRef.current += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setStatusText(`Hearing: "${transcriptRef.current || interim}"`);
        };

        recognition.onerror = (e: any) => console.warn('SpeechRecognition error:', e);
        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.start();
      setIsRecording(true);
      setStatusText('Listening to your voice... Speak now');
    } catch (err: any) {
      alert(`Microphone access error: ${err.message}. Please allow microphone permissions.`);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setStatusText('Processing neural acoustics & course notes...');
  };

  const processVoiceQuery = async (queryText: string, audioBlob?: Blob) => {
    if (!activeCourseId) return;
    const promptText = queryText.trim() || "What are the core concepts covered in this module, J.A.R.V.I.S.?";

    // Immediate display of user audio message
    const tempUserMsg: DisplayMessage = {
      id: String(Date.now()),
      role: 'user',
      transcript: promptText,
      audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : undefined,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setTextInput('');

    try {
      const resp = await api.tutor.askVoice(
        activeCourseId,
        promptText,
        audioBlob,
        activeConvId || undefined
      );

      if (resp.conversation_id && resp.conversation_id !== activeConvId) {
        setActiveConvId(resp.conversation_id);
      }

      const jarvisMsg: DisplayMessage = {
        id: resp.message_id || String(Date.now() + 1),
        role: 'assistant',
        transcript: resp.answer,
        speechText: resp.speech_text,
        audioUrl: resp.assistant_audio_url,
        citations: resp.citations,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, jarvisMsg]);

      // Automatically speak J.A.R.V.I.S. audio response!
      if (autoSpeak) {
        speakAsJarvis(resp.speech_text || resp.answer, jarvisMsg.id);
      }

      // Refresh conversations sidebar
      loadConversations();
    } catch (err: any) {
      const errJarvis: DisplayMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        transcript: `Apologies, Sir. An error occurred in the neural synthesis: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errJarvis]);
      if (autoSpeak) speakAsJarvis(`Apologies, Sir. An error occurred: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-7.5rem)] flex flex-col md:flex-row gap-4">
      {/* Voice Chat History Sidebar (Like ChatGPT) */}
      <div className="w-full md:w-72 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <History className="w-4 h-4 text-cyan-400" /> Audio Sessions
          </div>
          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            title="New Voice Session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No voice recordings yet. Tap the Arc Reactor to begin.
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => loadConversationMessages(conv.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500/80 text-white shadow-md shadow-cyan-500/5'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-950 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-[11px] truncate">
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>{conv.message_count} audio exchanges</span>
                    <span>{new Date(conv.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Voice Autoplay Toggle */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-[11px]">
            {autoSpeak ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            J.A.R.V.I.S. Voice Output
          </span>
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
              autoSpeak ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {autoSpeak ? 'Audio ON' : 'Muted'}
          </button>
        </div>
      </div>

      {/* Main J.A.R.V.I.S. Hologram & Audio Workspace */}
      <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden relative">
        {/* Top HUD Status Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold tracking-wider text-cyan-400 font-mono text-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              J.A.R.V.I.S.
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-mono text-[11px] truncate max-w-[280px]">
              {statusText}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isJarvisSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              >
                <Pause className="w-3 h-3" /> Stop Speech
              </button>
            )}
            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/20">
              NVIDIA Nemotron 3 Nano
            </span>
          </div>
        </div>

        {/* Audio Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs space-y-3 ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-tr-none shadow-md shadow-cyan-600/20'
                    : 'bg-slate-950/90 border border-cyan-500/30 text-slate-200 rounded-tl-none glow-cyan'
                }`}
              >
                {/* Role header & audio controls */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-cyan-400">
                    {m.role === 'user' ? 'Student Audio Input' : 'J.A.R.V.I.S. Voice Response'}
                  </span>
                  {m.role === 'assistant' && (
                    <button
                      onClick={() => speakAsJarvis(m.speechText || m.transcript, m.id)}
                      className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700"
                    >
                      <Play className="w-3 h-3" /> Replay Voice
                    </button>
                  )}
                </div>

                {/* Stored Audio Player (If user or assistant audio exists) */}
                {m.audioUrl && (
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <audio controls src={m.audioUrl} className="w-full h-8" />
                  </div>
                )}

                {/* Transcript */}
                <div className="whitespace-pre-wrap leading-relaxed text-xs">
                  {m.transcript}
                </div>

                {/* Citations HUD */}
                {m.citations && m.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Grounded Archive References:
                    </span>
                    <div className="space-y-1">
                      {m.citations.map((c, i) => (
                        <div key={i} className="text-[11px] text-slate-300 bg-slate-900/60 p-1.5 rounded border border-slate-800">
                          📄 {c.filename} <span className="text-cyan-400 font-mono">(Page {c.page_number})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}
        </div>

        {/* J.A.R.V.I.S. Iron Man Arc Reactor Voice Controller Bar */}
        <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex flex-col items-center gap-3">
          {/* Animated Arc Reactor Sphere */}
          <div className="flex items-center gap-6">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                isRecording
                  ? 'bg-rose-600 shadow-[0_0_35px_rgba(225,29,72,0.6)] animate-pulse border-4 border-rose-300'
                  : isJarvisSpeaking
                  ? 'bg-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.8)] border-4 border-cyan-200 animate-spin'
                  : 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 hover:scale-105 shadow-[0_0_25px_rgba(2,132,199,0.5)] border-4 border-cyan-400/40'
              }`}
              title={isRecording ? 'Click to Stop and Transmit' : 'Click to Speak into J.A.R.V.I.S.'}
            >
              {/* Inner Reactor Rings */}
              <div className="w-10 h-10 rounded-full border-2 border-white/60 flex items-center justify-center">
                {isRecording ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </div>
            </button>

            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                {isRecording ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    Recording Microphone...
                  </span>
                ) : isJarvisSpeaking ? (
                  <span className="text-cyan-400 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 animate-pulse" /> J.A.R.V.I.S. Vocalizing...
                  </span>
                ) : (
                  <span>Voice Interface Active</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isRecording
                  ? 'Click the Arc Reactor when finished speaking.'
                  : 'Tap the Arc Reactor to ask by voice, or type below.'}
              </p>
            </div>
          </div>

          {/* Fallback Text / Transcript input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (textInput.trim()) processVoiceQuery(textInput);
            }}
            className="w-full max-w-2xl flex gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type a query for J.A.R.V.I.S. to vocalize..."
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
