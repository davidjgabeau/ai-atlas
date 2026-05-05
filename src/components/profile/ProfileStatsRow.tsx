type ProfileStatsRowProps = {
  hasProfile: boolean;
  topCategory: string | null;
  watchingCount: number;
};

export function ProfileStatsRow({
  hasProfile,
  topCategory,
  watchingCount,
}: ProfileStatsRowProps) {
  const stats = [
    {
      label: "Saved",
      value: `${watchingCount} ${watchingCount === 1 ? "company" : "companies"}`,
    },
    {
      label: "Top category",
      value: topCategory ?? "None yet",
    },
    {
      label: "Public profile",
      value: hasProfile ? "Ready to share" : "Not published yet",
    },
  ];

  return (
    <section className="bg-[#F8F6F1]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <dl className="grid overflow-hidden rounded-md border border-[#E7E1D8] bg-[#FBFAF7] sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="px-4 py-4 sm:px-5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[#E7E1D8] sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-t-0"
            >
              <dt className="text-xs font-medium text-[#66625C]">
                {stat.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#111111]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
