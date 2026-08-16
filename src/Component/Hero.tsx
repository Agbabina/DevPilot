import { useEffect, useState } from "react";

const COMMANDS = [
  "devpilot init",
  "devpilot ai plan",
  "devpilot task finish",
  "devpilot status",
  "devpilot project create"
];

const TYPE_SPEED = 55;
const DELETE_SPEED = 30;
const HOLD_TIME = 1400;

export default function TypewriterHero() {
  const [commandIndex, setCommandIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">(
    "typing",
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(()=>{
    localStorage.getItem("theme")
  })
  // Respect the user's motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setText(COMMANDS[0]);
      return;
    }

    const current = COMMANDS[commandIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (text.length < current.length) {
        timeout = setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          TYPE_SPEED,
        );
      } else {
        timeout = setTimeout(() => setPhase("holding"), HOLD_TIME);
      }
    } else if (phase === "holding") {
      timeout = setTimeout(() => setPhase("deleting"), 0);
    } else {
      // deleting
      if (text.length > 0) {
        timeout = setTimeout(
          () => setText(current.slice(0, text.length - 1)),
          DELETE_SPEED,
        );
      } else {
        setCommandIndex((i) => (i + 1) % COMMANDS.length);
        setPhase("typing");
      }
    }

    return () => clearTimeout(timeout);
  }, [text, phase, commandIndex, reducedMotion]);

  return (
    <section className="w-full flex flex-col items-center justify-center text-center px-6 py-24 gap-6 bg-white">
      <style>{`
        @keyframes dp-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .dp-cursor {
          animation: dp-blink 1s step-end infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .dp-cursor { animation: none; opacity: 1; }
        }
      `}</style>

      <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-slate-950">
        Turn your coding journey into progress.
      </h1>

      <p className="text-lg text-slate-500 max-w-xl">
        Manage projects, complete milestones, earn XP, and level up your developer career.
      </p>

      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-6 py-4 font-mono text-base sm:text-lg text-cyan-700 shadow-lg min-w-[280px] text-left">
        <span className="text-slate-400 mr-2">$</span>
        <span>{text}</span>
        <span className="dp-cursor text-amber-400">▍</span>
      </div>
    </section>
  );
}

