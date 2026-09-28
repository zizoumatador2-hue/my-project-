export const BODY_TYPES = [
  { value: 'Sedan', slug: 'sedans', plural: 'Sedans' },
  { value: 'SUV', slug: 'suvs', plural: 'SUVs' },
  { value: 'Truck', slug: 'trucks', plural: 'Trucks' },
  { value: 'Coupe', slug: 'coupes', plural: 'Coupes' },
  { value: 'Hatchback', slug: 'hatchbacks', plural: 'Hatchbacks' },
  { value: 'Minivan', slug: 'minivans', plural: 'Minivans' },
  { value: 'Convertible', slug: 'convertibles', plural: 'Convertibles' },
  { value: 'Wagon', slug: 'wagons', plural: 'Wagons' },
  { value: 'Van', slug: 'vans', plural: 'Vans' },
] as const;

export const FUEL_TYPES = ['Gasoline', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric', 'Flex Fuel'] as const;
export const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT'] as const;
export const DRIVETRAINS = ['FWD', 'RWD', 'AWD', '4WD'] as const;
export const CONDITIONS = [
  { value: 'used', label: 'Used' },
  { value: 'certified', label: 'Certified Pre-Owned' },
  { value: 'new', label: 'New' },
] as const;
export const COLORS = [
  'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Beige', 'Gold', 'Orange', 'Yellow', 'Purple', 'Other',
] as const;
export const TITLE_STATUSES = ['clean', 'rebuilt', 'salvage', 'lemon', 'unknown'] as const;

export const PRICE_BUCKETS = [
  { slug: 'under-5000', max: 5000, label: 'Under $5,000' },
  { slug: 'under-10000', max: 10000, label: 'Under $10,000' },
  { slug: 'under-15000', max: 15000, label: 'Under $15,000' },
  { slug: 'under-20000', max: 20000, label: 'Under $20,000' },
  { slug: 'under-30000', max: 30000, label: 'Under $30,000' },
] as const;

export const LEAD_TYPES = {
  contact: 'Contact Dealer',
  info: 'Request More Information',
  price: 'Request Price',
  test_drive: 'Schedule Test Drive',
  financing: 'Financing Inquiry',
} as const;
export type LeadType = keyof typeof LEAD_TYPES;

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'closed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest listings' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
  { value: 'mileage_asc', label: 'Lowest mileage' },
  { value: 'year_desc', label: 'Newest model year' },
  { value: 'distance', label: 'Closest first' },
] as const;

export const RADII = [10, 25, 50, 100, 200] as const;
export const PAGE_SIZE = 24;
