import type { Category, GeneratedSignalLabel } from "@/types/market";

export type AskAtlasCompanyCard = {
  id: string;
  name: string;
  slug: string;
  category: Category;
  stage: string;
  hook: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  signalLabel: GeneratedSignalLabel;
  views: number;
};

export type AskAtlasMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskAtlasStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "companies";
      companies: AskAtlasCompanyCard[];
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "done";
    };
