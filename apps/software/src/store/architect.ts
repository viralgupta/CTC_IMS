import { atom } from "recoil";

export interface ArchitectType {
  name: string;
  id: number;
  balance: string | null;
  area: string;
  phone_numbers: {
    phone_number: string;
  }[];
}

export interface ViewArchitectType extends ArchitectType {
  profileUrl: string | null;
  tier_id: number;
  phone_numbers: {
    id: number;
    phone_number: string;
    country_code: string | null;
    whatsappChatId: string | null;
    isPrimary: boolean | null;
  }[];
  orders: {
    id: number;
    status: "Pending" | "Delivered";
    architect_commision: string | null;
    created_at: Date;
    customer: {
      name: string;
    } | null;
    delivery_address: {
      house_number: string;
      address: string;
    } | null;
  }[];
  tier: {
    name: string;
  };
}

export const allArchitectAtom = atom<ArchitectType[]>({
  key: "allArchitectAtom",
  default: [],
});

export const viewArchitectIdAtom = atom<number | null>({
  key: "viewArchitectIdAtom",
  default: null,
});

export const viewArchitectAtom = atom<ViewArchitectType | null>({
  key: "viewArchitectAtom",
  default: null,
});
