export type NigerianUniversity = 'UNIBEN' | 'UNIABUJA' | 'EKSU' | 'OOU' | 'UNILAG' | 'LASU';

export const UNIVERSITIES: { value: NigerianUniversity; label: string }[] = [
  { value: 'UNIBEN', label: 'University of Benin' },
  { value: 'UNIABUJA', label: 'University of Abuja' },
  { value: 'EKSU', label: 'Ekiti State University' },
  { value: 'OOU', label: 'Olabisi Onabanjo University' },
  { value: 'UNILAG', label: 'University of Lagos' },
  { value: 'LASU', label: 'Lagos State University' },
];

export const ITEM_CATEGORIES = [
  'Textbooks',
  'Electronics',
  'Furniture',
  'Clothing',
  'Kitchen',
  'Stationery',
  'Sports',
  'General',
] as const;

export interface Profile {
  id: string;
  full_name: string;
  university: NigerianUniversity;
  phone: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface ItemRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  university: NigerianUniversity;
  status: string;
  created_at: string;
  updated_at: string;
}
