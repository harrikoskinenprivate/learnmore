const marks = [
  { top: "3%", left: "1%", size: "1.35rem", rotate: "-11deg" },
  { top: "7%", left: "62%", size: "4.6rem", rotate: "7deg" },
  { top: "16%", left: "22%", size: "2.1rem", rotate: "13deg" },
  { top: "21%", left: "78%", size: "1.5rem", rotate: "-16deg" },
  { top: "28%", left: "4%", size: "3.3rem", rotate: "-5deg" },
  { top: "34%", left: "48%", size: "6.2rem", rotate: "-2deg" },
  { top: "43%", left: "14%", size: "1.8rem", rotate: "9deg" },
  { top: "49%", left: "70%", size: "2.7rem", rotate: "-13deg" },
  { top: "58%", left: "36%", size: "4.1rem", rotate: "4deg" },
  { top: "64%", left: "6%", size: "1.6rem", rotate: "15deg" },
  { top: "71%", left: "58%", size: "5.4rem", rotate: "-8deg" },
  { top: "79%", left: "18%", size: "2.4rem", rotate: "-6deg" },
  { top: "86%", left: "74%", size: "1.45rem", rotate: "11deg" },
  { top: "91%", left: "40%", size: "3.6rem", rotate: "-14deg" },
];

export function BackgroundMarks() {
  return (
    <div aria-hidden className="background-marks pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {marks.map((mark) => (
        <span
          key={`${mark.top}-${mark.left}`}
          className="absolute whitespace-nowrap font-semibold text-ink/10 select-none"
          style={{
            top: mark.top,
            left: mark.left,
            fontSize: mark.size,
            transform: `rotate(${mark.rotate})`,
          }}
        >
          Blackboard
        </span>
      ))}
    </div>
  );
}
