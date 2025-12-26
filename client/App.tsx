import React, { useState, useRef, useEffect } from 'react';
import Mascot from './components/Mascot';
import { 
  generateExplanationStream, 
  generateIllustration, 
  generateAudio, 
  decode, 
  decodeAudioData 
} from './services/gemini';
import { AppState } from './types';

const DISCOVERY_SUGGESTIONS = [
  { text: "Why is the sky blue?", icon: "☁️", color: "bg-blue-100 border-blue-200 text-blue-800" },
  { text: "How do birds fly?", icon: "🐦", color: "bg-orange-100 border-orange-200 text-orange-800" },
  { text: "What is a rainbow?", icon: "🌈", color: "bg-pink-100 border-pink-200 text-pink-800" },
  { text: "Where does rain come from?", icon: "🌧️", color: "bg-emerald-100 border-emerald-200 text-emerald-800" }
];

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [state, setState] = useState<AppState>({
    isThinking: false,
    isAudioLoading: false,
    currentResult: null,
    error: null,
    history: [],
  });

  const [audioState, setAudioState] = useState<'stopped' | 'playing'>('stopped');
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(finalTranscript);
          recognition.stop();
          handleAsk(undefined, finalTranscript);
        } else if (interimTranscript) {
          setInput(interimTranscript);
        }
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        setInput(''); // Clear input for new voice session
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Recognition start failed, likely already running:", err);
      }
    }
  };

  const stopVoice = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setAudioState('stopped');
  };

  const playVoice = async (base64: string) => {
    if (!base64) return;
    stopVoice();
    try {
      const ctx = await initAudio();
      const bytes = decode(base64);
      const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setAudioState('stopped');
      source.start(0);
      sourceNodeRef.current = source;
      setAudioState('playing');
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  const handleAsk = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const finalQ = (overrideText || input).trim();
    if (!finalQ || state.isThinking) return;

    // Capture user interaction for audio context immediately
    await initAudio();

    stopVoice();
    setState(prev => ({ 
      ...prev, 
      isThinking: true, 
      isAudioLoading: false, 
      error: null, 
      currentResult: { question: finalQ, explanation: "", imageUrl: "", audioData: "" } 
    }));
    setInput('');

    try {
      generateIllustration(finalQ).then(img => {
        setState(prev => prev.currentResult ? { ...prev, currentResult: { ...prev.currentResult, imageUrl: img } } : prev);
      });

      let fullText = "";
      for await (const chunk of generateExplanationStream(finalQ)) {
        fullText += chunk;
        setState(prev => prev.currentResult ? { ...prev, currentResult: { ...prev.currentResult, explanation: fullText } } : prev);
      }

      if (fullText) {
        setState(prev => ({ ...prev, isThinking: false, isAudioLoading: true }));
        const audio = await generateAudio(fullText);
        setState(prev => {
          if (prev.currentResult) {
            return { ...prev, isAudioLoading: false, currentResult: { ...prev.currentResult, audioData: audio } };
          }
          return { ...prev, isAudioLoading: false };
        });
        if (audio) playVoice(audio);
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, isThinking: false, isAudioLoading: false, error: err.message }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fdfcf0] safe-top safe-bottom">
      <header className="py-6 flex justify-center shrink-0">
        <h1 className="text-4xl font-kids text-purple-600 drop-shadow-md">WonderWhys</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 flex flex-col items-center pb-28">
        <Mascot status={state.isThinking || state.isAudioLoading ? 'thinking' : audioState === 'playing' ? 'happy' : 'idle'} />

        {state.error && (
          <div className="w-full max-w-md p-5 bg-red-100 text-red-700 rounded-3xl text-center font-bold animate-pop-in mb-4 border-2 border-red-200">
            {state.error}
          </div>
        )}

        {state.currentResult && (
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-2xl border-2 border-purple-100 animate-pop-in mb-6 relative">
            <h2 className="text-lg font-kids text-purple-300 mb-4 text-center italic">"{state.currentResult.question}"</h2>
            
            {state.currentResult.imageUrl && (
              <div className="mb-4 rounded-3xl overflow-hidden aspect-square shadow-inner bg-emerald-50">
                <img src={state.currentResult.imageUrl} className="w-full h-full object-cover" alt="Discovery Visual" />
              </div>
            )}

            <p className="text-xl text-gray-800 font-medium leading-relaxed text-center font-sans mb-4">
              {state.currentResult.explanation || "Mrs. Wonder is typing..."}
            </p>

            {(state.currentResult.audioData || state.isAudioLoading) && (
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => audioState === 'playing' ? stopVoice() : state.currentResult?.audioData && playVoice(state.currentResult.audioData)}
                  disabled={state.isAudioLoading}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${state.isAudioLoading ? 'bg-gray-200' : 'bg-purple-600 text-white'}`}
                >
                  {state.isAudioLoading ? '⌛' : audioState === 'playing' ? '⏹️' : '🔊'}
                </button>
                <p className="text-xs font-bold text-purple-400 mt-2 uppercase tracking-widest">
                  {state.isAudioLoading ? 'Thinking...' : audioState === 'playing' ? 'Listening...' : 'Play Voice'}
                </p>
              </div>
            )}

            <button 
              onClick={() => setState(prev => ({ ...prev, currentResult: null }))}
              className="mt-8 w-full py-4 bg-emerald-50 text-emerald-600 font-bold rounded-2xl hover:bg-emerald-100 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Ask Another?</span>
              <span className="text-xl">🎒</span>
            </button>
          </div>
        )}

        {!state.currentResult && !state.isThinking && (
          <div className="w-full max-w-md animate-pop-in">
            <div className="text-center mb-10">
              <p className="font-kids text-3xl text-emerald-600 mb-2">Namaste Praggya!</p>
              <p className="text-gray-500 font-medium text-lg">Tap a question or ask your own!</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {DISCOVERY_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(undefined, s.text)}
                  className={`flex items-center p-6 rounded-[2rem] border-2 ${s.color} transition-all active:scale-95 shadow-lg bg-white/50 backdrop-blur-sm`}
                >
                  <span className="text-4xl mr-5">{s.icon}</span>
                  <span className="text-xl font-bold text-left leading-tight">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md rounded-t-[3rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-purple-100 z-50">
        <form onSubmit={handleAsk} className="flex items-center space-x-4 max-w-md mx-auto">
          <button 
            type="button"
            onClick={toggleListening}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-purple-600'}`}
          >
            <span className="text-3xl text-white">{isListening ? '⏹️' : '🎤'}</span>
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask Mrs. Wonder..."}
              className={`w-full pl-6 pr-14 py-5 rounded-full bg-purple-50 border-2 font-kids text-2xl focus:outline-none focus:border-purple-300 transition-all shadow-inner ${isListening ? 'border-red-300 ring-2 ring-red-100' : 'border-purple-100'}`}
            />
            <button 
              type="submit" 
              className="absolute right-2 top-2 w-11 h-11 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform"
            >
              ➔
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;