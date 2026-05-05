"use client";

import { useEffect } from "react";

import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { useCompanyView } from "@/hooks/useCompanyView";

type CompanyProfileViewCounterProps = {
  companyId: string;
  initialViews?: number;
  className?: string;
};

export function CompanyProfileViewCounter({
  companyId,
  initialViews = 0,
  className,
}: CompanyProfileViewCounterProps) {
  const { views, recordView } = useCompanyView(companyId, initialViews);

  useEffect(() => {
    void recordView();
  }, [recordView]);

  return (
    <CompanyViewCount
      views={views}
      showTextLabel
      className={className}
    />
  );
}
