type Segment = {
  label: string;
  onClick?: () => void;
};

type Props = {
  segments: Segment[];
  visible: boolean;
};

export default function PathBreadcrumb({ segments, visible }: Props) {
  return (
    <div
      aria-hidden={!visible}
      className={`overflow-hidden transition-all duration-300 ease-out ${
        visible ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <p className="break-words font-mono text-[13px] leading-relaxed text-muted-2">
        {segments.map((segment, i) => {
          const isLast = i === segments.length - 1;
          return (
            <span key={segment.label + i}>
              {segment.onClick ? (
                <button
                  type="button"
                  onClick={segment.onClick}
                  className="text-muted-2 underline decoration-border-strong decoration-1 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {segment.label}
                </button>
              ) : (
                <span className={isLast ? "text-accent" : ""}>{segment.label}</span>
              )}
              {!isLast && <span className="text-border-strong">/</span>}
            </span>
          );
        })}
        <span className="text-border-strong">/</span>
      </p>
    </div>
  );
}
