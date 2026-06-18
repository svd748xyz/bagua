import type { HexagramOut, YaoOut } from "../api/types";

interface Props {
  hexagram: HexagramOut;
  yaos?: YaoOut[];   // 若提供，动爻会高亮
  label?: string;    // 标题，如"本卦""变卦"
}

// 把单卦渲染成 6 条爻线，自上而下显示（上爻在顶部）。
// 阳爻 ▄▄▄▄▄，阴爻 ▄▄  ▄▄。动爻用朱红标记。
export default function HexagramFigure({ hexagram, yaos, label }: Props) {
  // 从上到下渲染（lines[5] 是上爻，显示在最上）
  const indices = [5, 4, 3, 2, 1, 0];
  return (
    <div className="hexagram-figure">
      {label && <div className="hex-label">{label}</div>}
      <div className="hex-unicode">{hexagram.unicode}</div>
      <div className="hex-lines">
        {indices.map((i) => {
          const isYang = hexagram.lines[i];
          const yao = yaos?.[i];
          const isMoving = yao?.is_moving ?? false;
          return (
            <div
              key={i}
              className={"yao" + (isYang ? " yang" : " yin") + (isMoving ? " moving" : "")}
              title={yao ? yao.label : ""}
            >
              {isYang ? (
                <span className="yao-line solid">▄▄▄▄▄</span>
              ) : (
                <span className="yao-line broken">▄▄　▄▄</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="hex-name">{hexagram.name}</div>
    </div>
  );
}
