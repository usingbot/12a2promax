import { Compass } from "../ui/Mark";
const points = [
  [7, 12, 5],
  [14, 19, 2],
  [25, 10, 8],
  [32, 22, 3],
  [43, 8, 3],
  [52, 15, 6],
  [71, 10, 4],
  [78, 17, 2],
  [95, 9, 7],
  [91, 46, 3],
  [77, 54, 6],
  [66, 74, 3],
  [51, 87, 8],
  [40, 75, 4],
  [30, 83, 6],
  [19, 87, 4],
  [7, 59, 8],
  [3, 38, 4],
  [57, 70, 4],
  [97, 79, 6],
  [87, 92, 3],
];
export default function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <div className="terrain" />
      <div className="sky-grain" />
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        className="star-trails"
      >
        <path
          d="M-22 390 Q 39 347 89 386 T 257 390 Q 314 382 267 328 T 345 222 M682 95 Q751 48 776 106 T878 173 Q938 185 1008 103"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />
        <g
          fill="none"
          stroke="currentColor"
          strokeOpacity=".65"
          strokeWidth=".8"
        >
          <path d="M360 62 386 48 415 67 439 40 M692 374 717 356 744 375 764 346" />
        </g>
        {[
          [360, 62],
          [386, 48],
          [415, 67],
          [439, 40],
          [692, 374],
          [717, 356],
          [744, 375],
          [764, 346],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="1.8" fill="currentColor" />
        ))}
      </svg>
      {points.map(([x, y, s], i) => (
        <span
          className="sky-star"
          key={i}
          style={{ left: x + "%", top: y + "%", fontSize: s * 2 + 5 }}
        >
          ✧
        </span>
      ))}
      <Compass className="map-compass" />
    </div>
  );
}
