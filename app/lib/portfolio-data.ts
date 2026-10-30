export type PortfolioStatus = 'pending' | 'approved' | 'rejected';

export type PortfolioProject = {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
};

export type PortfolioEducation = {
  id: string;
  degree: string;
  institution: string;
  location: string;
  period: string;
  result: string;
};

export type PortfolioExperience = {
  id: string;
  role: string;
  organization: string;
  period: string;
  description: string;
};

export type PortfolioProfile = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  bio: string;
  image: string;
  bgImage: string;
  accentColor: string;
  skills: string[];
  projects: PortfolioProject[];
  education: PortfolioEducation[];
  experience: PortfolioExperience[];
  status: PortfolioStatus;
  createdAt: string;
};

export type AdminProfile = PortfolioProfile & {
  trxId: string;
  couponCode: string;
  couponApplied: boolean;
  amount: number;
  couponValid: boolean;
  paymentVerified: boolean;
};

export const COLOR_PRESETS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Green', value: '#10b981' },
  { label: 'Orange', value: '#f59e0b' },
  { label: 'Red', value: '#ef4444' },
];

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
