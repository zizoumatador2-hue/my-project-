export type PlanId = 'free' | 'basic' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;
  vehicleLimit: number;
  featuredSlots: number;
  perks: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceCents: 0,
    vehicleLimit: 10,
    featuredSlots: 0,
    perks: ['Up to 10 active vehicles', 'Basic dealer profile page', 'Unlimited leads', 'Lead management dashboard'],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    priceCents: 4900,
    vehicleLimit: 75,
    featuredSlots: 2,
    perks: ['Up to 75 active vehicles', 'Full dealer profile with logo & hours', '2 featured vehicle slots included', 'Listing & lead analytics'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCents: 9900,
    vehicleLimit: 500,
    featuredSlots: 10,
    perks: ['Up to 500 active vehicles', 'Featured dealer placement on the homepage', '10 featured vehicle slots included', 'Priority support'],
  },
};

export const planOf = (id: string | null | undefined): Plan => PLANS[(id as PlanId) in PLANS ? (id as PlanId) : 'free'];
