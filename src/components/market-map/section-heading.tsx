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
      <h2 className="mt-3 font-heading text-[30px] font-medium leading-[1.05] tracking-[-0.025em] text-[#181818] md:text-[38px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[680px] text-base leading-[1.6] text-[#5F5A52]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
