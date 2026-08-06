import { Pause, Play } from "lucide-react";

interface Props {
  hours: number[];
  currentIndex: number;
  onChange: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  disabled: boolean;
}

export default function TimeSlider({ hours, currentIndex, onChange, isPlaying, onTogglePlay, disabled }: Props) {
  const maxIdx = Math.max(0, hours.length - 1);
  const currentHour = hours[currentIndex] ?? 0;

  return (
    <div className="time-slider">
      <button className="play-btn" onClick={onTogglePlay} disabled={disabled}>
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <span className="time-label start">0 сағ</span>
      <input
        type="range"
        min={0}
        max={maxIdx}
        value={currentIndex}
        disabled={disabled}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="time-range"
      />
      <span className="time-label end">{hours[maxIdx] ?? 0} сағ</span>
      <span className="time-current">{currentHour} сағ</span>
    </div>
  );
}
