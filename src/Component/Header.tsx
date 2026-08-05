import { Flame, Bolt } from "lucide-react";

export default function Header(){
    const level = 7;
    const xpLevel = 2140
    return (
        <>
        <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8">
          <div className="flex items-center gap-4">
		<div className="flex flex-col items-center gap-2">
			<div className="h-10 w-10 rounded-full bg-gray-300" />
			<div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
			<div className="h-full w-[70%] rounded-full bg-blue-600" />
			</div>
		</div>
		<div className="flex items-center gap-2">
			<h1 className="text-xl font-bold text-gray-900">
			Agbabina
			</h1>

			<span className="text-gray-400">
			Level {level} Builder
			</span>
		</div>
		</div>

          {/* User Stats */}
          <div className="flex items-center gap-8">

            {/* Streak */}
            <div className="flex items-center gap-2">
              <Flame
                size={20}
                className="text-orange-500"
              />

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  12 Day Streak
                </p>

                <p className="text-xs text-gray-400">
                  Keep it going!
                </p>
              </div>
            </div>

            {/* XP */}
            <div className="flex items-center gap-2">
              <Bolt
                size={20}
                className="text-yellow-500"
              />

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {xpLevel} XP
                </p>

                <p className="text-xs text-gray-400">
                  Total XP
                </p>
              </div>
            </div>

          </div>
        </header>
        </>
    )
}

