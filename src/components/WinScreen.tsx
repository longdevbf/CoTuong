"use client";

interface WinScreenProps {
  message: string;
  onBack: () => void;
  onRestart: () => void;
}

export default function WinScreen({ message, onBack, onRestart }: WinScreenProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-yellow-100 border-4 border-yellow-500 rounded-xl p-10 flex flex-col items-center gap-6 shadow-2xl">
        <h2 className="text-3xl font-bold text-black">{message}</h2>
        <div className="flex gap-4">
          <button
            onClick={onRestart}
            className="px-6 py-2 bg-green-500 text-white rounded-lg text-lg font-semibold hover:bg-green-600 transition"
          >
            Chơi lại
          </button>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-red-500 text-white rounded-lg text-lg font-semibold hover:bg-red-600 transition"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
