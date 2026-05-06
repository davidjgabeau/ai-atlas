export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="editorial-label">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-section-title mt-3 md:text-[38px]">
        {title}
      </h2>
      {description ? (
        <p className="text-body mt-3 max-w-[680px] text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
