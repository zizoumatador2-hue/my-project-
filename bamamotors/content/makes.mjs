// Makes & models reference data. `popular` makes get dedicated intro copy on /used-cars/{make}.
const m = (name, body) => ({ name, body });

export const makes = [
  { name: 'Toyota', popular: 1, intro: 'Shop used Toyota cars, trucks and SUVs for sale in Alabama. Toyota models like the Camry, Corolla, RAV4 and Tacoma are known for long service lives and strong resale value, which makes them a favorite with Alabama shoppers who want dependable transportation.', models: [m('Camry', 'Sedan'), m('Corolla', 'Sedan'), m('RAV4', 'SUV'), m('Tacoma', 'Truck'), m('Tundra', 'Truck'), m('Highlander', 'SUV'), m('4Runner', 'SUV'), m('Sienna', 'Minivan'), m('Prius', 'Hatchback'), m('Sequoia', 'SUV')] },
  { name: 'Honda', popular: 1, intro: 'Find used Honda cars and SUVs for sale across Alabama. The Honda Civic and Accord are long-running favorites for commuters, while the CR-V, Pilot and Odyssey cover families who need more space.', models: [m('Civic', 'Sedan'), m('Accord', 'Sedan'), m('CR-V', 'SUV'), m('Pilot', 'SUV'), m('Odyssey', 'Minivan'), m('HR-V', 'SUV'), m('Ridgeline', 'Truck'), m('Passport', 'SUV')] },
  { name: 'Ford', popular: 1, intro: 'Browse used Ford trucks, SUVs and cars for sale in Alabama. The F-150 is one of the best-selling pickups in America, and Alabama dealers also stock plenty of Explorers, Escapes, Rangers and Mustangs.', models: [m('F-150', 'Truck'), m('F-250 Super Duty', 'Truck'), m('Ranger', 'Truck'), m('Mustang', 'Coupe'), m('Explorer', 'SUV'), m('Escape', 'SUV'), m('Expedition', 'SUV'), m('Edge', 'SUV'), m('Bronco', 'SUV'), m('Bronco Sport', 'SUV'), m('Maverick', 'Truck'), m('Fusion', 'Sedan')] },
  { name: 'Chevrolet', popular: 1, intro: 'Shop used Chevrolet trucks, SUVs and cars for sale in Alabama. Chevy pickups like the Silverado and full-size SUVs like the Tahoe and Suburban are Alabama staples, alongside the Equinox, Traverse and Malibu.', models: [m('Silverado 1500', 'Truck'), m('Silverado 2500HD', 'Truck'), m('Colorado', 'Truck'), m('Tahoe', 'SUV'), m('Suburban', 'SUV'), m('Equinox', 'SUV'), m('Traverse', 'SUV'), m('Trax', 'SUV'), m('Blazer', 'SUV'), m('Malibu', 'Sedan'), m('Camaro', 'Coupe'), m('Corvette', 'Coupe')] },
  { name: 'GMC', popular: 0, models: [m('Sierra 1500', 'Truck'), m('Sierra 2500HD', 'Truck'), m('Canyon', 'Truck'), m('Yukon', 'SUV'), m('Yukon XL', 'SUV'), m('Acadia', 'SUV'), m('Terrain', 'SUV')] },
  { name: 'Ram', popular: 0, models: [m('1500', 'Truck'), m('2500', 'Truck'), m('3500', 'Truck'), m('ProMaster', 'Van')] },
  { name: 'Nissan', popular: 1, intro: 'Find used Nissan cars, trucks and SUVs for sale in Alabama, including the Altima, Rogue, Sentra, Frontier and Pathfinder.', models: [m('Altima', 'Sedan'), m('Sentra', 'Sedan'), m('Maxima', 'Sedan'), m('Rogue', 'SUV'), m('Murano', 'SUV'), m('Pathfinder', 'SUV'), m('Armada', 'SUV'), m('Kicks', 'SUV'), m('Frontier', 'Truck'), m('Titan', 'Truck')] },
  { name: 'Hyundai', popular: 1, intro: 'Shop used Hyundai cars and SUVs for sale in Alabama, including the Elantra, Sonata, Tucson, Santa Fe and Palisade.', models: [m('Elantra', 'Sedan'), m('Sonata', 'Sedan'), m('Tucson', 'SUV'), m('Santa Fe', 'SUV'), m('Palisade', 'SUV'), m('Kona', 'SUV'), m('Venue', 'SUV'), m('Santa Cruz', 'Truck'), m('Ioniq 5', 'SUV')] },
  { name: 'Kia', popular: 1, intro: 'Browse used Kia cars and SUVs for sale in Alabama, including the Sorento, Telluride, Sportage, K5 and Forte.', models: [m('Forte', 'Sedan'), m('K5', 'Sedan'), m('Optima', 'Sedan'), m('Soul', 'Hatchback'), m('Sportage', 'SUV'), m('Sorento', 'SUV'), m('Telluride', 'SUV'), m('Seltos', 'SUV'), m('Carnival', 'Minivan')] },
  { name: 'Jeep', popular: 1, intro: 'Find used Jeep SUVs and trucks for sale in Alabama, from the Wrangler and Gladiator to the Grand Cherokee and Cherokee.', models: [m('Wrangler', 'SUV'), m('Grand Cherokee', 'SUV'), m('Cherokee', 'SUV'), m('Compass', 'SUV'), m('Renegade', 'SUV'), m('Gladiator', 'Truck'), m('Wagoneer', 'SUV')] },
  { name: 'Dodge', popular: 0, models: [m('Charger', 'Sedan'), m('Challenger', 'Coupe'), m('Durango', 'SUV'), m('Grand Caravan', 'Minivan')] },
  { name: 'Chrysler', popular: 0, models: [m('Pacifica', 'Minivan'), m('300', 'Sedan'), m('Voyager', 'Minivan')] },
  { name: 'Subaru', popular: 0, models: [m('Outback', 'Wagon'), m('Forester', 'SUV'), m('Crosstrek', 'SUV'), m('Ascent', 'SUV'), m('Impreza', 'Sedan'), m('Legacy', 'Sedan')] },
  { name: 'Mazda', popular: 0, models: [m('CX-5', 'SUV'), m('CX-30', 'SUV'), m('CX-50', 'SUV'), m('CX-9', 'SUV'), m('CX-90', 'SUV'), m('Mazda3', 'Sedan'), m('MX-5 Miata', 'Convertible')] },
  { name: 'Volkswagen', popular: 0, models: [m('Jetta', 'Sedan'), m('Passat', 'Sedan'), m('Tiguan', 'SUV'), m('Atlas', 'SUV'), m('Taos', 'SUV'), m('Golf', 'Hatchback')] },
  { name: 'Mercedes-Benz', popular: 0, models: [m('C-Class', 'Sedan'), m('E-Class', 'Sedan'), m('GLC', 'SUV'), m('GLE', 'SUV'), m('GLS', 'SUV'), m('GLA', 'SUV')] },
  { name: 'BMW', popular: 0, models: [m('3 Series', 'Sedan'), m('5 Series', 'Sedan'), m('X1', 'SUV'), m('X3', 'SUV'), m('X5', 'SUV'), m('X7', 'SUV')] },
  { name: 'Lexus', popular: 0, models: [m('ES', 'Sedan'), m('IS', 'Sedan'), m('RX', 'SUV'), m('NX', 'SUV'), m('GX', 'SUV')] },
  { name: 'Acura', popular: 0, models: [m('MDX', 'SUV'), m('RDX', 'SUV'), m('TLX', 'Sedan'), m('Integra', 'Hatchback')] },
  { name: 'Infiniti', popular: 0, models: [m('QX50', 'SUV'), m('QX60', 'SUV'), m('QX80', 'SUV'), m('Q50', 'Sedan')] },
  { name: 'Audi', popular: 0, models: [m('A4', 'Sedan'), m('A6', 'Sedan'), m('Q3', 'SUV'), m('Q5', 'SUV'), m('Q7', 'SUV')] },
  { name: 'Cadillac', popular: 0, models: [m('Escalade', 'SUV'), m('XT4', 'SUV'), m('XT5', 'SUV'), m('XT6', 'SUV'), m('CT5', 'Sedan')] },
  { name: 'Buick', popular: 0, models: [m('Enclave', 'SUV'), m('Encore', 'SUV'), m('Encore GX', 'SUV'), m('Envision', 'SUV')] },
  { name: 'Lincoln', popular: 0, models: [m('Navigator', 'SUV'), m('Aviator', 'SUV'), m('Nautilus', 'SUV'), m('Corsair', 'SUV')] },
  { name: 'Tesla', popular: 0, models: [m('Model 3', 'Sedan'), m('Model Y', 'SUV'), m('Model S', 'Sedan'), m('Model X', 'SUV')] },
  { name: 'Mitsubishi', popular: 0, models: [m('Outlander', 'SUV'), m('Eclipse Cross', 'SUV'), m('Mirage', 'Hatchback')] },
];

export const categories = [
  { slug: 'car-buying-guides', name: 'Car Buying Guides', description: 'Step-by-step advice for buying a used car with confidence.' },
  { slug: 'used-car-prices', name: 'Used Car Prices', description: 'What used cars cost in Alabama, built from real listing data.' },
  { slug: 'financing', name: 'Financing', description: 'Auto loans, credit and budgeting for your next car.' },
  { slug: 'vehicle-reviews', name: 'Vehicle Reviews', description: 'Model overviews and what to look for when buying used.' },
  { slug: 'alabama-car-buying', name: 'Alabama Car Buying', description: 'Titles, registration, taxes and local advice for Alabama drivers.' },
  { slug: 'dealer-guides', name: 'Dealer Guides', description: 'Resources for Alabama dealerships listing on BamaMotors.' },
  { slug: 'maintenance', name: 'Maintenance', description: 'Keep your car running well in Alabama heat, humidity and storms.' },
];
