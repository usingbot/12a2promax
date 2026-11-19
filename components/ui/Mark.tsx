import Link from "next/link";
export function Compass({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      fill="none"
    >
      <circle cx="32" cy="32" r="19" stroke="currentColor" strokeWidth="1.1" />
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="currentColor"
        strokeWidth=".5"
        strokeDasharray="1 3"
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <g key={deg} transform={`rotate(${deg} 32 32)`}>
          <path d={`M32 ${i % 2 ? 14 : 3} 36 28 32 32Z`} fill="currentColor" />
          <path
            d={`M32 ${i % 2 ? 14 : 3} 28 28 32 32Z`}
            stroke="currentColor"
            strokeWidth=".9"
          />
        </g>
      ))}
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>
  );
}
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="12A2 Pro Max, về trang chủ">
      <Compass />
      <span>
        <strong>12A2 Pro Max</strong>
        <small>LƯU BÚT THANH XUÂN</small>
      </span>
    </Link>
  );
}
