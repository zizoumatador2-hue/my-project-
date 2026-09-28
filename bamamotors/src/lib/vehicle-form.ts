import type { VehicleDetail } from './vehicles';

export function vehicleToForm(v: VehicleDetail, features: string[]): Record<string, string> {
  const s = (x: unknown) => (x === null || x === undefined ? '' : String(x));
  return {
    dealer_id: s(v.dealer_id), year: s(v.year), make_id: s(v.make_id), model_id: s(v.model_id), trim: s(v.trim), condition: v.condition,
    price: s(Math.round(v.price_cents / 100)), mileage: s(v.mileage), vin: s(v.vin), stock_number: s(v.stock_number), body_type: v.body_type,
    fuel_type: v.fuel_type, transmission: v.transmission, drivetrain: v.drivetrain, engine: s(v.engine), exterior_color: s(v.exterior_color),
    interior_color: s(v.interior_color), mpg_city: s(v.mpg_city), mpg_highway: s(v.mpg_highway), description: s(v.description),
    features: features.join('\n'), title_status: s(v.title_status || 'unknown'), owners: s(v.owners), accident_free: s(v.accident_free),
    service_records: s(v.service_records), history_report_url: s(v.history_report_url), status: v.status,
  };
}
