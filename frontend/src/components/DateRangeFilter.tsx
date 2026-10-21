type DateRangeFilterProps = {
  start: string;
  end: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
};

function DateRangeFilter({ start, end, onChangeStart, onChangeEnd }: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        aria-label="Start date"
        value={start}
        onChange={(e) => onChangeStart(e.target.value)}
        className="bg-black border border-gray-700 rounded-md text-sm text-gray-200 px-2 py-1"
      />
      <span className="text-gray-500 text-xs hidden sm:inline" aria-hidden="true">→</span>
      <input
        type="date"
        aria-label="End date"
        value={end}
        onChange={(e) => onChangeEnd(e.target.value)}
        className="bg-black border border-gray-700 rounded-md text-sm text-gray-200 px-2 py-1"
      />
    </div>
  );
}

export default DateRangeFilter;