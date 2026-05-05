export type AvatarArchetype =
  | "founder"
  | "engineer"
  | "product_manager"
  | "designer"
  | "data_scientist"
  | "researcher"
  | "operator"
  | "vc"
  | "investor"
  | "finance"
  | "legal"
  | "growth_marketer"
  | "sales"
  | "recruiter"
  | "customer_success"
  | "creative_director"
  | "photographer"
  | "writer"
  | "student"
  | "intern"
  | "barista"
  | "artist"
  | "musician"
  | "entrepreneur";

export type AvatarDefinition = {
  id: string;
  archetype: AvatarArchetype;
  label: string;
  src: string;
  tags: string[];
};

const avatarPath = (name: string) => `/avatars/people/${name}.png`;

export const avatarCatalog = [
  {
    id: "founder-01",
    archetype: "founder",
    label: "Founder",
    src: avatarPath("founder"),
    tags: ["founder", "minimal", "black", "soho"],
  },
  {
    id: "founder-female-01",
    archetype: "founder",
    label: "Founder Femme",
    src: avatarPath("founder-female"),
    tags: ["founder", "female", "femme", "minimal", "soho"],
  },
  {
    id: "engineer-01",
    archetype: "engineer",
    label: "Engineer",
    src: avatarPath("engineer"),
    tags: ["engineer", "systems", "backpack", "brooklyn"],
  },
  {
    id: "engineer-female-01",
    archetype: "engineer",
    label: "Engineer Femme",
    src: avatarPath("engineer-female"),
    tags: ["engineer", "female", "femme", "hoodie", "brooklyn"],
  },
  {
    id: "product-manager-01",
    archetype: "product_manager",
    label: "Product Manager",
    src: avatarPath("product-manager"),
    tags: ["product", "manager", "laptop", "flatiron"],
  },
  {
    id: "designer-01",
    archetype: "designer",
    label: "Designer",
    src: avatarPath("designer"),
    tags: ["designer", "black", "minimal", "nolita"],
  },
  {
    id: "designer-female-01",
    archetype: "designer",
    label: "Designer Femme",
    src: avatarPath("designer-female"),
    tags: ["designer", "female", "femme", "camera", "nolita"],
  },
  {
    id: "data-scientist-01",
    archetype: "data_scientist",
    label: "Data Scientist",
    src: avatarPath("data-scientist"),
    tags: ["data", "scientist", "coffee", "research"],
  },
  {
    id: "researcher-01",
    archetype: "researcher",
    label: "Researcher",
    src: avatarPath("researcher"),
    tags: ["researcher", "cap", "notebook", "fair"],
  },
  {
    id: "operator-01",
    archetype: "operator",
    label: "Operator",
    src: avatarPath("operator"),
    tags: ["operator", "clean", "minimal", "midtown"],
  },
  {
    id: "vc-01",
    archetype: "vc",
    label: "VC",
    src: avatarPath("vc"),
    tags: ["vc", "vest", "finance", "flatiron"],
  },
  {
    id: "vc-female-01",
    archetype: "vc",
    label: "VC Femme",
    src: avatarPath("vc-female"),
    tags: ["vc", "female", "femme", "phone", "fair"],
  },
  {
    id: "investor-01",
    archetype: "investor",
    label: "Investor",
    src: avatarPath("investor"),
    tags: ["investor", "coffee", "black", "flatiron"],
  },
  {
    id: "investor-female-01",
    archetype: "investor",
    label: "Investor Femme",
    src: avatarPath("investor-female"),
    tags: ["investor", "female", "femme", "white-suit", "tribeca"],
  },
  {
    id: "finance-01",
    archetype: "finance",
    label: "Finance",
    src: avatarPath("finance"),
    tags: ["finance", "briefcase", "markets", "tribeca"],
  },
  {
    id: "legal-01",
    archetype: "legal",
    label: "Legal",
    src: avatarPath("legal"),
    tags: ["legal", "operator", "black", "midtown"],
  },
  {
    id: "growth-marketer-01",
    archetype: "growth_marketer",
    label: "Growth Marketer",
    src: avatarPath("growth-marketer"),
    tags: ["growth", "marketing", "cap", "downtown"],
  },
  {
    id: "sales-01",
    archetype: "sales",
    label: "Sales",
    src: avatarPath("sales"),
    tags: ["sales", "phone", "suit", "midtown"],
  },
  {
    id: "recruiter-01",
    archetype: "recruiter",
    label: "Recruiter",
    src: avatarPath("recruiter"),
    tags: ["recruiter", "female", "femme", "coffee"],
  },
  {
    id: "customer-success-01",
    archetype: "customer_success",
    label: "Customer Success",
    src: avatarPath("customer-success"),
    tags: ["customer-success", "tablet", "black", "operator"],
  },
  {
    id: "creative-director-01",
    archetype: "creative_director",
    label: "Creative Director",
    src: avatarPath("creative-director"),
    tags: ["creative", "director", "camera", "downtown"],
  },
  {
    id: "photographer-01",
    archetype: "photographer",
    label: "Photographer",
    src: avatarPath("photographer"),
    tags: ["photographer", "camera", "fair", "creative"],
  },
  {
    id: "writer-01",
    archetype: "writer",
    label: "Writer",
    src: avatarPath("writer"),
    tags: ["writer", "notebook", "brownstone", "brooklyn"],
  },
  {
    id: "student-01",
    archetype: "student",
    label: "Student",
    src: avatarPath("student"),
    tags: ["student", "backpack", "cap", "campus"],
  },
  {
    id: "intern-01",
    archetype: "intern",
    label: "Intern",
    src: avatarPath("intern"),
    tags: ["intern", "tote", "female", "femme"],
  },
  {
    id: "barista-01",
    archetype: "barista",
    label: "Barista",
    src: avatarPath("barista"),
    tags: ["barista", "coffee", "green", "neighborhood"],
  },
  {
    id: "artist-01",
    archetype: "artist",
    label: "Artist",
    src: avatarPath("artist"),
    tags: ["artist", "brush", "sash", "creative"],
  },
  {
    id: "musician-01",
    archetype: "musician",
    label: "Musician",
    src: avatarPath("musician"),
    tags: ["musician", "instrument", "green", "brooklyn"],
  },
  {
    id: "entrepreneur-female-01",
    archetype: "entrepreneur",
    label: "Entrepreneur Femme",
    src: avatarPath("entrepreneur-female"),
    tags: ["entrepreneur", "female", "femme", "tablet"],
  },
  {
    id: "entrepreneur-01",
    archetype: "entrepreneur",
    label: "Entrepreneur",
    src: avatarPath("entrepreneur"),
    tags: ["entrepreneur", "beanie", "operator", "brooklyn"],
  },
] satisfies AvatarDefinition[];

const avatarAliases: Record<string, string> = {
  "founder-minimal-01": "founder-01",
  "founder-minimal-femme-01": "founder-female-01",
  "founder-minimal-fair-01": "researcher-01",
  "vc-patagonia-01": "vc-01",
  "vc-patagonia-femme-01": "vc-female-01",
  "vc-patagonia-fair-01": "researcher-01",
  "engineer-hoodie-01": "engineer-01",
  "engineer-hoodie-femme-01": "engineer-female-01",
  "engineer-hoodie-fair-01": "student-01",
  "designer-black-01": "designer-01",
  "designer-black-femme-01": "designer-female-01",
  "designer-black-fair-01": "photographer-01",
  "finance-modern-01": "finance-01",
  "finance-modern-femme-01": "investor-female-01",
  "finance-modern-fair-01": "finance-01",
  "creative-expressive-01": "creative-director-01",
  "creative-expressive-femme-01": "artist-01",
  "creative-expressive-fair-01": "photographer-01",
  "operator-clean-01": "operator-01",
  "operator-clean-femme-01": "customer-success-01",
  "operator-clean-fair-01": "sales-01",
  "founder-minimal-02": "entrepreneur-01",
};

export const defaultAvatarId = avatarCatalog[0].id;
export const publicAvatarIds: string[] = avatarCatalog.map(
  (avatar) => avatar.id,
);

export function resolveAvatarId(avatarId?: string | null) {
  return avatarAliases[avatarId ?? ""] ?? avatarId;
}

export function getAvatarById(avatarId?: string | null) {
  const resolvedAvatarId = resolveAvatarId(avatarId);

  return (
    avatarCatalog.find((avatar) => avatar.id === resolvedAvatarId) ??
    avatarCatalog.find((avatar) => avatar.id === defaultAvatarId) ??
    avatarCatalog[0]
  );
}

export function isAvatarId(avatarId?: string | null): avatarId is string {
  return publicAvatarIds.includes(resolveAvatarId(avatarId) ?? "");
}
