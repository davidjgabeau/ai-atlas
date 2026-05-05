import { revalidatePath } from "next/cache";

export function revalidateMarketPages(companySlug?: string) {
  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath("/categories");
  revalidatePath("/insights");
  revalidatePath("/feed");
  revalidatePath("/admin");

  if (companySlug) {
    revalidatePath(`/companies/${companySlug}`);
  }
}
