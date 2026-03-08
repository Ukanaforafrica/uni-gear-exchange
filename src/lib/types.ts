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
  'Gadgets',
  'Furniture',
  'Clothing',
  'Kitchenware',
  'Stationery',
  'Sports',
  'General',
] as const;

export const CONDITION_RATINGS = [
  { value: 'New', label: 'New (Unopened)' },
  { value: 'Like New', label: 'Like New (Used once or twice)' },
  { value: 'Good', label: 'Good (Signs of wear but fully functional)' },
  { value: 'Fair', label: 'Fair (Visible scratches/dents)' },
  { value: 'For Parts', label: 'For Parts (Not working)' },
] as const;

export const USAGE_DURATIONS = [
  'Less than 1 month',
  '1-3 months',
  '1 semester',
  '2 semesters',
  '1 year',
  '2+ years',
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

export interface Item {
  id: string;
  user_id: string;
  title: string;
  category: string;
  price: number;
  negotiable: boolean;
  condition: string;
  usage_duration: string;
  defects: string;
  description: string;
  university: string;
  photos: string[];
  video_url: string;
  status: string;
  listed_at: string;
  expires_at: string;
  relist_count: number;
  created_at: string;
  updated_at: string;
}
