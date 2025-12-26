import React, { useState, useEffect, useRef } from 'react';

const MASCOT_COLORS = [
  'bg-yellow-400',
  'bg-pink-400',
  'bg-blue-400',
  'bg-green-400',
  'bg-orange-400',
  'bg-purple-400'
];

const FRIENDLY_PHRASES = [
  "You're a superstar! ⭐",
  "Hehe, that tickles! 🖐️",
  "I love learning with you! 📚",
  "What a big brain you have! 🧠",
  "Yay, science! 🧪",
  "Ask me more, ask me more! 🎈",
  "You're doing great! 🌟",
  "Boop! 👃",
  "You ask the best questions! 🌈",
  "Keep exploring, little explorer! 🧭",
  "Knowledge is like magic! ✨",
  "Wiggle wiggle! 💃",
  "You make me so happy! 😊",
  "Ready for another discovery? 🚀",
  "Thinking is my favorite exercise! 🤸",
  "You're as bright as a lightbulb! 💡",
  "High five! ✋",
  "Let's learn something amazing! 📖",
  "Wow! You're so curious! 🧐",
  "Every question is a new adventure! 🗺️",
  "You're a genius in the making! 🎓",
  "Is it time for a fun fact? 🦒",
  "My tummy is full of wonders! 🍯",
  "I'm your learning buddy! 🤝"
];

const INTERACTION_ANIMS = [
  'animate-wiggle',
  'animate-spin-once',
  'animate-bounce',
  'scale-110'
];

interface MascotProps {
  status: 'idle' | 'thinking' | 'happy' | 'sad';
}

const Mascot: React.FC<MascotProps> = ({ status }) => {
  const [colorIndex, setColorIndex] = useState(0);
  const [interaction, setInteraction] = useState<{ phrase: string, anim: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setColorIndex((prev) => (prev + 1) % MASCOT_COLORS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBoop = () => {
    if (status === 'thinking') return;

    if (window.navigator.vibrate) {
      window.navigator.vibrate(15);
    }

    const randomPhrase = FRIENDLY_PHRASES[Math.floor(Math.random() * FRIENDLY_PHRASES.length)];
    const randomAnim = INTERACTION_ANIMS[Math.floor(Math.random() * INTERACTION_ANIMS.length)];
    
    setInteraction({ phrase: randomPhrase, anim: randomAnim });

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setInteraction(null);
    }, 3000);
  };

  const getBodyClasses = () => {
    let base = "w-full h-full rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl relative cursor-pointer active:scale-95 ";
    
    if (interaction && status !== 'thinking') {
      return base + MASCOT_COLORS[colorIndex] + " " + interaction.anim;
    }

    if (status === 'thinking') {
      return base + "bg-indigo-400 rotate-12 scale-105 animate-pulse";
    }
    if (status === 'sad') {
      return base + "bg-slate-400 grayscale-[0.3] -translate-y-2";
    }
    if (status === 'happy') {
      return base + MASCOT_COLORS[colorIndex] + " scale-105 animate-bounce";
    }
    return base + MASCOT_COLORS[colorIndex];
  };

  return (
    <div 
      className={`relative w-64 h-64 sm:w-80 sm:h-80 mx-auto mt-4 mb-4 ${status === 'idle' && !interaction ? 'animate-gentle-bounce' : ''}`}
      onClick={handleBoop}
    >
      {/* Speech Bubble */}
      {interaction && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-6 py-4 rounded-[2rem] shadow-2xl border-2 border-purple-100 z-[60] whitespace-nowrap animate-pop-in">
          <p className="text-lg font-bold text-purple-600 italic">{interaction.phrase}</p>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-b-2 border-r-2 border-purple-100 rotate-45"></div>
        </div>
      )}

      {/* Mascot Body */}
      <div className={getBodyClasses()}>
        {/* Eyes */}
        <div className="flex space-x-16 mb-4">
          <div className={`w-8 h-8 bg-white rounded-full relative overflow-hidden ${status === 'sad' ? 'h-2 mt-3' : ''}`}>
             <div className="absolute top-1 left-1 w-5 h-5 bg-black rounded-full"></div>
          </div>
          <div className={`w-8 h-8 bg-white rounded-full relative overflow-hidden ${status === 'sad' ? 'h-2 mt-3' : ''}`}>
             <div className="absolute top-1 left-1 w-5 h-5 bg-black rounded-full"></div>
          </div>
        </div>
        {/* Mouth */}
        <div className={`w-20 h-10 border-b-8 border-white rounded-full transition-all duration-300 ${status === 'thinking' ? 'w-8 h-8 rounded-full border-8 border-white' : ''} ${status === 'sad' ? 'w-14 h-2 rounded-none border-b-4 border-white translate-y-4' : 'mt-2'}`}></div>
      </div>
      
      {/* Shadow */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-4 bg-black/10 rounded-full blur-xl"></div>
    </div>
  );
};

export default Mascot;