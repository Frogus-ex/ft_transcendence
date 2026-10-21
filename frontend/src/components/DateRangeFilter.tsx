type DateRangeFilterProps = {
  start: string;
  end: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
};

function DateRangeFilter({ start, end, onChangeStart, onChangeEnd }: DateRangeFilterProps) {
  return (
    <div className="flex gap-2 items-center">
      <input
        type="date"
        value={start}
        onChange={(e) => onChangeStart(e.target.value)}
        className="bg-black border border-gray-700 rounded-md text-sm text-gray-200 px-2 py-1"
      />
      <span className="text-gray-500 text-xs">→</span>
      <input
        type="date"
        value={end}
        onChange={(e) => onChangeEnd(e.target.value)}
        className="bg-black border border-gray-700 rounded-md text-sm text-gray-200 px-2 py-1"
      />
    </div>
  );
}

export default DateRangeFilter;