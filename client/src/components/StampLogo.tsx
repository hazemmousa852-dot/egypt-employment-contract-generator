/*
 * DESIGN: "الديوان الرسمي" — لوجو الختم الدائري (رسم برمجي SVG)
 * ختم أحمر بدائرتين مزدوجتين مع قلم ريشة ووثيقة — رمز التوثيق الرسمي.
 */
export default function StampLogo({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-label="شعار منشئ العقود"
    >
      {/* Outer thick ring */}
      <circle cx="50" cy="50" r="47" stroke="var(--seal, #8B2635)" strokeWidth="4" />
      {/* Inner thin ring */}
      <circle cx="50" cy="50" r="38" stroke="var(--seal, #8B2635)" strokeWidth="1.5" />
      {/* Ornamental dots between rings */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const r = 42.5;
        const x = 50 + r * Math.cos((deg * Math.PI) / 180);
        const y = 50 + r * Math.sin((deg * Math.PI) / 180);
        return (
          <g key={deg}>
            {deg % 90 === 0 ? (
              <polygon
                points={`${x},${y - 3} ${x + 2.6},${y} ${x},${y + 3} ${x - 2.6},${y}`}
                fill="var(--seal, #8B2635)"
              />
            ) : (
              <circle cx={x} cy={y} r="1.8" fill="var(--seal, #8B2635)" />
            )}
          </g>
        );
      })}
      {/* Quill pen diagonal */}
      <path
        d="M 34 66 L 52 34 L 56 38 L 38 70 Z"
        fill="var(--seal, #8B2635)"
        opacity="0.9"
      />
      <path
        d="M 52 34 C 56 30 62 30 66 34 C 60 38 58 40 56 38 Z"
        fill="var(--seal, #8B2635)"
        opacity="0.75"
      />
      {/* Document */}
      <path
        d="M 42 62 L 42 78 L 70 78 L 70 62 L 62 56 L 42 56 Z M 62 56 L 62 62 L 70 62"
        stroke="var(--seal, #8B2635)"
        strokeWidth="2"
        fill="none"
      />
      <line x1="46" y1="66" x2="60" y2="66" stroke="var(--seal, #8B2635)" strokeWidth="1.5" opacity="0.6" />
      <line x1="46" y1="71" x2="66" y2="71" stroke="var(--seal, #8B2635)" strokeWidth="1.5" opacity="0.6" />
      <line x1="46" y1="76" x2="58" y2="76" stroke="var(--seal, #8B2635)" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
