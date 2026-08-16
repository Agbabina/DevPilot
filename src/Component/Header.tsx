import { useEffect, useState } from "react";
import { Flame, Bolt, Coins } from "lucide-react";
import { getCurrentUser } from "../services/user";
import type {User} from "../services/user";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error(err);
      }
    }

    loadUser();
  }, []);

  if (!user) {
    return (
      <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur md:px-8">
        <p className="text-gray-500">Loading...</p>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-200">
          {user.username.charAt(0).toUpperCase()}
        </div>

        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            {user.username}
          </h2>

          <span className="text-xs text-slate-400">
            Level {user.level} Builder
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-8 sm:flex">
        <div className="flex items-center gap-2">
          <Flame
            size={20}
            className="text-orange-500"
          />

          <div>
            <p className="text-sm font-semibold text-gray-900">
              {user.currentStreak} Day{user.currentStreak !== 1 && "s"} Streak
            </p>

            <p className="text-xs text-xs text-slate-400">
              Keep it going!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Coins size={20} className="text-cyan-500" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.coins} Coins</p>
            <p className="text-xs text-gray-400">Spendable rewards</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Bolt
            size={20}
            className="text-amber-500"
          />

          <div>
            <p className="text-sm font-semibold text-gray-900">
              {user.totalXp} XP
            </p>

            <p className="text-xs text-xs text-slate-400">
              Total XP
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}


