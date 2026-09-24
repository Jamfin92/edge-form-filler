// Content script: scans the page (including open shadow roots), detects what
// each field wants based on its name/id/label/placeholder/autocomplete, and
// fills it with plausible sample data. Textareas and contenteditables get
// Lorem Ipsum. Values are set through the native prototype setters so React,
// Vue, and Angular forms see the change.
(() => {
  'use strict';

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pad2 = (n) => String(n).padStart(2, '0');

  // ---------------------------------------------------------------- sample data

  const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Jamie', 'Dana', 'Sam', 'Robin', 'Charlie', 'Devon', 'Emerson', 'Harper'];
  const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Moore', 'Clark', 'Walker'];
  const STREETS = ['Maple Street', 'Oak Avenue', 'Cedar Lane', 'Elm Drive', 'Willow Way', 'Birch Boulevard', 'Pine Court', 'Juniper Road', 'Aspen Terrace', 'Chestnut Place'];
  const CITIES = ['Springfield', 'Riverton', 'Fairview', 'Lakeside', 'Greenville', 'Milton', 'Ashford', 'Brookdale', 'Clayton', 'Dayton'];
  const STATES = ['CA', 'NY', 'TX', 'WA', 'IL', 'CO', 'GA', 'NC', 'OH', 'AZ', 'OR', 'MA'];
  const COMPANIES = ['Acme Corp', 'Globex', 'Initech', 'Umbrella Labs', 'Aperture Science', 'Vandelay Industries', 'Wonka Ltd', 'Hooli', 'Soylent Co', 'Cyberdyne Systems'];
  const JOB_TITLES = ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'Marketing Lead', 'Operations Manager', 'Consultant', 'Accountant'];
  const PRODUCT_ADJ = ['Turbo', 'Quantum', 'Nimbus', 'Vertex', 'Atlas', 'Pulse', 'Nova', 'Orbit', 'Zephyr', 'Apex'];
  const PRODUCT_NOUN = ['Widget', 'Gizmo', 'Toolkit', 'Tracker', 'Hub', 'Console', 'Planner', 'Router', 'Blender', 'Kit'];
  const PRODUCT_SUFFIX = ['Pro', 'Mini', 'X', '360', '3000', 'Plus'];
  const SERVICES = ['Consulting', 'Installation', 'Maintenance', 'Training', 'Onboarding', 'Premium Support', 'Auditing', 'Cloud Hosting', 'Managed Backup', 'Same-Day Delivery'];
  const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'Human Resources', 'Customer Support', 'Design'];
  const INDUSTRIES = ['Software', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Finance', 'Hospitality', 'Logistics'];

  // Objects (firearms, vehicles, cameras, general products): each run picks
  // one of each so make, model, caliber, year, serial, etc. agree with each
  // other. Every make lists 2-3 models.
  // Firearm models: [model, caliber, type, action, barrel inches, capacity].
  const FIREARMS = [
    ['Glock', [['G19', '9mm Luger', 'Pistol', 'Semi-automatic', '4.02', 15], ['G17', '9mm Luger', 'Pistol', 'Semi-automatic', '4.49', 17], ['G43X', '9mm Luger', 'Pistol', 'Semi-automatic', '3.41', 10]]],
    ['Smith & Wesson', [['M&P9 Shield Plus', '9mm Luger', 'Pistol', 'Semi-automatic', '3.1', 13], ['Model 686', '.357 Magnum', 'Revolver', 'Double action', '4', 6], ['M&P15 Sport II', '5.56 NATO', 'Rifle', 'Semi-automatic', '16', 30]]],
    ['Ruger', [['10/22 Carbine', '.22 LR', 'Rifle', 'Semi-automatic', '18.5', 10], ['LCP II', '.380 ACP', 'Pistol', 'Semi-automatic', '2.75', 6], ['American Rifle', '.308 Winchester', 'Rifle', 'Bolt action', '22', 4]]],
    ['Sig Sauer', [['P320 Compact', '9mm Luger', 'Pistol', 'Semi-automatic', '3.9', 15], ['P365', '9mm Luger', 'Pistol', 'Semi-automatic', '3.1', 10], ['MCX Spear LT', '.300 Blackout', 'Rifle', 'Semi-automatic', '9', 30]]],
    ['Remington', [['870 Express', '12 Gauge', 'Shotgun', 'Pump action', '28', 4], ['Model 700 SPS', '.308 Winchester', 'Rifle', 'Bolt action', '24', 4]]],
    ['Mossberg', [['500 Field', '12 Gauge', 'Shotgun', 'Pump action', '28', 5], ['590A1', '12 Gauge', 'Shotgun', 'Pump action', '20', 8], ['Patriot', '6.5 Creedmoor', 'Rifle', 'Bolt action', '22', 5]]],
    ['Springfield Armory', [['Hellcat', '9mm Luger', 'Pistol', 'Semi-automatic', '3', 11], ['XD-M Elite', '.45 ACP', 'Pistol', 'Semi-automatic', '4.5', 13]]],
    ['Colt', [['1911 Government', '.45 ACP', 'Pistol', 'Semi-automatic', '5', 7], ['Python', '.357 Magnum', 'Revolver', 'Double action', '4.25', 6]]],
    ['Beretta', [['92FS', '9mm Luger', 'Pistol', 'Semi-automatic', '4.9', 15], ['A300 Outlander', '12 Gauge', 'Shotgun', 'Semi-automatic', '28', 3]]],
    ['Savage Arms', [['Axis II', '.30-06 Springfield', 'Rifle', 'Bolt action', '22', 4], ['Mark II FV', '.22 LR', 'Rifle', 'Bolt action', '21', 5]]]
  ];
  const FIREARM_FINISHES = ['Black', 'Matte Black', 'Stainless', 'Flat Dark Earth', 'OD Green', 'Blued'];
  // Vehicles: [make, VIN manufacturer prefix, [[model, body style, trims,
  // optional { years: [first, last], colors, wmi }]]] — the options pin a
  // model to its real model years and factory paint.
  const VEHICLES = [
    ['Toyota', '4T1', [['Camry', 'Sedan', ['LE', 'SE', 'XLE']], ['RAV4', 'SUV', ['LE', 'XLE', 'Limited']],
      ['Crown', 'Sedan', ['XLE', 'Limited', 'Platinum'], {
        years: [2023, 2025], wmi: 'JTD',
        colors: ['Oxygen White', 'Black', 'Heavy Metal', 'Wind Chill Pearl', 'Supersonic Red', 'Bronze Age / Black', 'Heavy Metal / Black', 'Supersonic Red / Black']
      }]]],
    ['Honda', '1HG', [['Civic', 'Sedan', ['LX', 'Sport', 'EX']], ['Accord', 'Sedan', ['LX', 'EX-L', 'Touring']], ['CR-V', 'SUV', ['EX', 'EX-L', 'Sport']]]],
    ['Ford', '1FT', [['F-150', 'Pickup Truck', ['XL', 'XLT', 'Lariat']], ['Escape', 'SUV', ['S', 'SE', 'Titanium']], ['Mustang', 'Coupe', ['EcoBoost', 'GT']]]],
    ['Chevrolet', '1G1', [['Silverado 1500', 'Pickup Truck', ['WT', 'LT', 'RST']], ['Malibu', 'Sedan', ['LS', 'LT']], ['Equinox', 'SUV', ['LS', 'LT', 'Premier']]]],
    ['Nissan', '1N4', [['Altima', 'Sedan', ['S', 'SV', 'SR']], ['Rogue', 'SUV', ['S', 'SV', 'SL']]]],
    ['Subaru', '4S4', [['Outback', 'Wagon', ['Base', 'Premium', 'Limited']], ['Forester', 'SUV', ['Base', 'Premium', 'Sport']]]],
    ['Jeep', '1C4', [['Wrangler', 'SUV', ['Sport', 'Sahara', 'Rubicon']], ['Grand Cherokee', 'SUV', ['Laredo', 'Limited']]]],
    ['Tesla', '5YJ', [['Model 3', 'Sedan', ['Standard', 'Long Range']], ['Model Y', 'SUV', ['Long Range', 'Performance']]]],
    ['Hyundai', '5NP', [['Elantra', 'Sedan', ['SE', 'SEL']], ['Tucson', 'SUV', ['SE', 'SEL', 'Limited']]]]
  ];
  const VEHICLE_COLORS = ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Beige'];
  // Cameras: [make, [[model, type, sensor, megapixels, mount, ISO range,
  // top video mode, stabilization, max shutter, weight, battery, card slots,
  // release year]]].
  const CAMERAS = [
    ['Sony', [
      ['a7S III', 'Mirrorless', 'Full-frame (35.6 x 23.8 mm) Exmor R BSI CMOS', '12.1', 'Sony E-mount', '80-102400 (expandable 40-409600)', '4K 120p 10-bit 4:2:2', '5-axis in-body, 5.5 stops', '1/8000 s', '699 g (with battery and card)', 'NP-FZ100', '2x CFexpress Type A / SD UHS-II', 2020],
      ['a7 IV', 'Mirrorless', 'Full-frame (35.9 x 23.9 mm) Exmor R BSI CMOS', '33', 'Sony E-mount', '100-51200 (expandable 50-204800)', '4K 60p 10-bit 4:2:2', '5-axis in-body, 5.5 stops', '1/8000 s', '658 g (with battery and card)', 'NP-FZ100', 'CFexpress Type A / SD UHS-II + SD UHS-II', 2021],
      ['a6700', 'Mirrorless', 'APS-C (23.3 x 15.5 mm) Exmor R BSI CMOS', '26', 'Sony E-mount', '100-32000 (expandable 50-102400)', '4K 120p 10-bit 4:2:2', '5-axis in-body, 5 stops', '1/4000 s', '493 g (with battery and card)', 'NP-FZ100', '1x SD UHS-II', 2023]]],
    ['Canon', [
      ['EOS R6 Mark II', 'Mirrorless', 'Full-frame (35.9 x 23.9 mm) CMOS', '24.2', 'Canon RF', '100-102400 (expandable 50-204800)', '4K 60p 10-bit 4:2:2', '5-axis in-body, up to 8 stops', '1/8000 s', '670 g (with battery and card)', 'LP-E6NH', '2x SD UHS-II', 2022],
      ['EOS R5', 'Mirrorless', 'Full-frame (36 x 24 mm) CMOS', '45', 'Canon RF', '100-51200 (expandable 50-102400)', '8K 30p 12-bit RAW', '5-axis in-body, up to 8 stops', '1/8000 s', '738 g (with battery and card)', 'LP-E6NH', 'CFexpress Type B + SD UHS-II', 2020],
      ['EOS 90D', 'DSLR', 'APS-C (22.3 x 14.8 mm) CMOS', '32.5', 'Canon EF/EF-S', '100-25600 (expandable 51200)', '4K 30p', 'Lens-based only', '1/8000 s', '701 g (with battery and card)', 'LP-E6N', '1x SD UHS-II', 2019]]],
    ['Nikon', [
      ['Z6 II', 'Mirrorless', 'Full-frame (35.9 x 23.9 mm) BSI CMOS', '24.5', 'Nikon Z', '100-51200 (expandable 50-204800)', '4K 60p', '5-axis in-body, 5 stops', '1/8000 s', '705 g (with battery and card)', 'EN-EL15c', 'CFexpress Type B/XQD + SD UHS-II', 2020],
      ['Z8', 'Mirrorless', 'Full-frame (35.9 x 23.9 mm) stacked CMOS', '45.7', 'Nikon Z', '64-25600 (expandable 32-102400)', '8K 60p 12-bit RAW', '5-axis in-body, 6 stops', '1/32000 s (electronic)', '910 g (with battery and card)', 'EN-EL15c', 'CFexpress Type B + SD UHS-II', 2023],
      ['D850', 'DSLR', 'Full-frame (35.9 x 23.9 mm) BSI CMOS', '45.7', 'Nikon F', '64-25600 (expandable 32-102400)', '4K 30p', 'Lens-based only', '1/8000 s', '1005 g (with battery and card)', 'EN-EL15a', 'XQD + SD UHS-II', 2017]]],
    ['Fujifilm', [
      ['X-T5', 'Mirrorless', 'APS-C (23.5 x 15.6 mm) X-Trans CMOS 5 HR', '40.2', 'Fujifilm X', '125-12800 (expandable 64-51200)', '6.2K 30p 10-bit 4:2:2', '5-axis in-body, 7 stops', '1/8000 s', '557 g (with battery and card)', 'NP-W235', '2x SD UHS-II', 2022],
      ['X-S20', 'Mirrorless', 'APS-C (23.5 x 15.6 mm) X-Trans CMOS 4', '26.1', 'Fujifilm X', '160-12800 (expandable 80-51200)', '6.2K 30p 10-bit 4:2:2', '5-axis in-body, 7 stops', '1/4000 s', '491 g (with battery and card)', 'NP-W235', '1x SD UHS-I', 2023]]]
  ];
  const LENSES = {
    'Sony E-mount': ['FE 24-70mm F2.8 GM II', 'FE 50mm F1.8', 'FE 16-35mm F4 G PZ'],
    'Canon RF': ['RF 24-105mm F4L IS USM', 'RF 50mm F1.8 STM', 'RF 70-200mm F2.8L IS USM'],
    'Canon EF/EF-S': ['EF-S 18-135mm f/3.5-5.6 IS USM', 'EF 50mm f/1.8 STM'],
    'Nikon Z': ['NIKKOR Z 24-70mm f/4 S', 'NIKKOR Z 50mm f/1.8 S', 'NIKKOR Z 70-200mm f/2.8 VR S'],
    'Nikon F': ['AF-S NIKKOR 24-70mm f/2.8E ED VR', 'AF-S NIKKOR 50mm f/1.8G'],
    'Fujifilm X': ['XF 18-55mm F2.8-4 R LM OIS', 'XF 16-80mm F4 R OIS WR', 'XF 33mm F1.4 R LM WR']
  };
  // General products: [make, [[model, category]]].
  const DEVICES = [
    ['Apple', [['MacBook Air 13"', 'Laptop'], ['iPhone 15', 'Smartphone'], ['iPad Air', 'Tablet']]],
    ['Samsung', [['Galaxy S24', 'Smartphone'], ['Galaxy Tab S9', 'Tablet'], ['RF28T5001SR', 'Refrigerator']]],
    ['Dell', [['XPS 13', 'Laptop'], ['Latitude 5440', 'Laptop']]],
    ['Lenovo', [['ThinkPad X1 Carbon', 'Laptop'], ['IdeaPad 5', 'Laptop']]],
    ['HP', [['LaserJet Pro M404n', 'Printer'], ['EliteBook 840', 'Laptop']]],
    ['Canon', [['PIXMA TR4720', 'Printer'], ['imageCLASS MF264dw', 'Printer']]],
    ['Sony', [['WH-1000XM5', 'Headphones'], ['Bravia XR A80L', 'Television'], ['PlayStation 5', 'Game Console']]],
    ['Whirlpool', [['WRF555SDFZ', 'Refrigerator'], ['WTW5000DW', 'Washer']]],
    ['Bosch', [['SHPM88Z75N', 'Dishwasher'], ['GSR18V-535', 'Drill']]],
    ['DeWalt', [['DCD791D2', 'Drill'], ['DCF887B', 'Impact Driver'], ['DCS570B', 'Circular Saw']]]
  ];
  const DEVICE_COLORS = ['Black', 'Silver', 'Space Gray', 'White', 'Graphite', 'Blue'];

  // Serial-number alphabet: no I, O or Q (easily confused with 1 and 0).
  const SERIAL_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const serialLetters = (n) => Array.from({ length: n }, () => pick(SERIAL_CHARS)).join('');
  const serialAlnum = (n) => Array.from({ length: n }, () => pick(SERIAL_CHARS + '0123456789')).join('');

  // 17-character VIN with a valid check digit (position 9) and model-year
  // code (position 10), so VIN validators accept it.
  function makeVin(wmi, year) {
    const translit = (c) => /\d/.test(c) ? Number(c) : 'ABCDEFGH'.includes(c) ? c.charCodeAt(0) - 64
      : 'JKLMN'.includes(c) ? c.charCodeAt(0) - 73 : c === 'P' ? 7 : c === 'R' ? 9 : c.charCodeAt(0) - 81;
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const yearCode = 'ABCDEFGHJKLMNPRSTVWXY123456789'[(year - 2010) % 30];
    const chars = (wmi + serialAlnum(5) + '0' + yearCode + serialAlnum(1) + String(randInt(100000, 999999))).split('');
    const sum = chars.reduce((acc, c, i) => acc + translit(c) * weights[i], 0);
    chars[8] = sum % 11 === 10 ? 'X' : String(sum % 11);
    return chars.join('');
  }

  function makeFirearm(make, year) {
    const [mk, models] = make ? FIREARMS.find(([m]) => m === make) : pick(FIREARMS);
    const [model, caliber, type, action, barrel, capacity] = pick(models);
    return {
      kind: 'firearm', make: mk, model, caliber, type, action, barrel, capacity: String(capacity),
      year: year || String(randInt(2015, 2025)),
      serial: serialLetters(3) + randInt(100000, 999999),
      color: pick(FIREARM_FINISHES)
    };
  }

  function makeVehicle(make, year) {
    const [mk, wmi, models] = make ? VEHICLES.find(([m]) => m === make) : pick(VEHICLES);
    // A kept year (see matchingOption) prefers models that were sold that year.
    const fits = (m) => !year || !m[3] || (year >= m[3].years[0] && year <= m[3].years[1]);
    const [model, body, trims, opts = {}] = pick(models.filter(fits).length ? models.filter(fits) : models);
    const [y1, y2] = opts.years || [2015, 2024];
    year = Number(year) >= y1 && Number(year) <= y2 ? Number(year) : randInt(y1, y2);
    return {
      kind: 'vehicle', make: mk, model, trim: pick(trims), type: body, year: String(year),
      vin: makeVin(opts.wmi || wmi, year),
      plate: `${randInt(1, 9)}${serialLetters(3)}${randInt(100, 999)}`,
      mileage: String(randInt(5, 120) * 1000 + randInt(0, 999)),
      capacity: body === 'Coupe' ? '4' : '5',
      color: pick(opts.colors || VEHICLE_COLORS)
    };
  }

  function makeCamera(make, year) {
    const [mk, models] = make ? CAMERAS.find(([m]) => m === make) : pick(CAMERAS);
    const [model, type, sensor, mp, mount, iso, video, stabilization, shutter, weight, battery, cards, released] = pick(models);
    return {
      kind: 'camera', make: mk, model, type, sensor, mp, mount, iso, video, stabilization, shutter, weight, battery,
      capacity: cards,
      lens: pick(LENSES[mount]),
      year: year || String(randInt(released, 2025)),
      serial: String(randInt(1000000, 9999999)),
      shutterCount: String(randInt(1, 60) * 1000 + randInt(0, 999)),
      color: model === 'X-T5' ? pick(['Black', 'Silver']) : 'Black'
    };
  }

  function makeDevice(make, year) {
    const [mk, models] = make ? DEVICES.find(([m]) => m === make) : pick(DEVICES);
    const [model, category] = pick(models);
    return {
      kind: 'device', make: mk, model, type: category,
      year: year || String(randInt(2020, 2025)),
      serial: serialAlnum(10),
      capacity: pick(['128 GB', '256 GB', '512 GB']),
      color: pick(DEVICE_COLORS)
    };
  }

  const OBJECT_MAKERS = { firearm: [FIREARMS, makeFirearm], vehicle: [VEHICLES, makeVehicle], camera: [CAMERAS, makeCamera], device: [DEVICES, makeDevice] };

  // Which kind of object a field is about: its own label/name first, then the
  // surrounding fieldset/section/form, then the page as a whole. At each
  // level the kind with the most keyword hits wins; a tie defers to the next.
  // A page mixing kinds needs a clear (2x) majority, else it's general products.
  const FIREARM_RE = /firearm|\bguns?\b|rifle|pistol|handgun|revolver|shotgun|calib(er|re)|\bgauge\b|\bammo\b|ammunition|\bffl\b|barrel|magazine|holster/g;
  const VEHICLE_RE = /vehicle|\bvin\b|\bcars?\b|truck|\bauto\b|automobile|motorcycle|mileage|odometer|licen[cs]e plate|\bsuv\b|sedan|dealership/g;
  const CAMERA_RE = /camera|\bdslr\b|mirrorless|\blens(es)?\b|shutter|megapixel/g;
  const KIND_RES = { firearm: FIREARM_RE, vehicle: VEHICLE_RE, camera: CAMERA_RE };

  function kindFromText(text, margin = 1) {
    const [[best, top], [, second]] = Object.entries(KIND_RES)
      .map(([kind, re]) => [kind, (text.match(re) || []).length])
      .sort((a, b) => b[1] - a[1]);
    return top > second * margin ? best : null;
  }

  function objectFor(el, p) {
    let kind = kindFromText(tokensFor(el));
    const section = !kind && el.closest && el.closest('fieldset, section, form, [role="group"]');
    if (section) kind = kindFromText(section.textContent.slice(0, 5000).toLowerCase());
    if (!kind) {
      if (p.pageKind === undefined) {
        const text = `${document.title} ${document.body ? document.body.innerText.slice(0, 20000) : ''}`;
        p.pageKind = kindFromText(text.toLowerCase(), 2) || 'device';
      }
      kind = p.pageKind;
    }
    return p[kind];
  }

  function makePersona() {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const n = randInt(1, 999);
    return {
      first,
      last,
      middle: pick(FIRST_NAMES),
      full: `${first} ${last}`,
      product: `${pick(PRODUCT_ADJ)} ${pick(PRODUCT_NOUN)} ${pick(PRODUCT_SUFFIX)}`,
      service: pick(SERVICES),
      email: `${first}.${last}${n}@example.com`.toLowerCase(),
      username: `${first}${last}${n}`.toLowerCase(),
      password: `Xk${randInt(10, 99)}!aB${randInt(100, 999)}z`,
      // (XXX) 555-01XX is the reserved fictional phone range.
      phone: `(${pick(['202', '303', '415', '512', '617'])}) 555-01${pad2(randInt(0, 99))}`,
      street: `${randInt(10, 9999)} ${pick(STREETS)}`,
      unit: `Apt ${randInt(1, 40)}${pick(['A', 'B', 'C', ''])}`,
      city: pick(CITIES),
      state: pick(STATES),
      zip: String(randInt(10000, 99999)),
      country: 'United States',
      company: pick(COMPANIES),
      job: pick(JOB_TITLES),
      website: `https://www.example.com/${last.toLowerCase()}`,
      age: String(randInt(21, 65)),
      firearm: makeFirearm(),
      vehicle: makeVehicle(),
      camera: makeCamera(),
      device: makeDevice()
    };
  }

  // Ordered: more specific patterns first ("username" must win over "name").
  const TEXT_PATTERNS = [
    [/e[-_ ]?mail/, (p) => p.email],
    [/user.?name|login|handle|nickname/, (p) => p.username],
    [/pass(word|phrase)|pwd/, (p) => p.password],
    [/phone|mobile|tel(?!l)|fax/, (p) => p.phone],
    [/zip|postal/, (p) => p.zip],
    [/first.?name|given|fname|forename/, (p) => p.first],
    [/last.?name|family|surname|lname/, (p) => p.last],
    [/company|organi[sz]ation|employer|business.?name/, (p) => p.company],
    [/job|title|role|position|occupation/, (p) => p.job],
    [/address.?(2|two)|line.?2|\bapt\b|suite|\bunit\b(?!.?price)/, (p) => p.unit],
    [/street|address/, (p) => p.street],
    [/(?<!capa)city|town|locality/, (p) => p.city],
    [/state|province|region/, (p) => p.state],
    [/country/, (p) => p.country],
    [/website|url|domain|homepage/, (p) => p.website],
    [/birth|dob/, () => isoDate(1965, 2004)],
    [/\bage\b/, (p) => p.age],
    [/card.?number|cc.?num/, () => '4111111111111111'],
    [/cvv|cvc|security.?code/, () => String(randInt(100, 999))],
    [/expir|exp.?date/, () => `12/${randInt(27, 32)}`],
    // Objects. "model year" must hit year before model; "model number" is
    // left to the SKU pattern below.
    [/\bvin\b|vehicle.?ident/, (p) => p.vehicle.vin],
    [/plate|registration.?(no|num)|\btag.?(no|num)/, (p) => p.vehicle.plate],
    [/mileage|odometer|\bmiles\b/, (p) => p.vehicle.mileage],
    [/\btrim\b/, (p) => p.vehicle.trim],
    [/body.?(style|type)/, (p) => p.vehicle.type],
    [/calib(er|re)|cartridge|chamber|\bgauge\b|ammunition|\bammo\b/, (p) => p.firearm.caliber],
    [/barrel/, (p, el) => /inch|\bin\b|"/.test(tokensFor(el)) || isNumericOnly(el) ? p.firearm.barrel : `${p.firearm.barrel}"`],
    [/\baction\b/, (p) => p.firearm.action],
    [/sensor/, (p) => p.camera.sensor],
    [/megapixel|\bmp\b|resolution/, (p, el) => isNumericOnly(el) || /megapixel|\bmp\b/.test(tokensFor(el)) ? p.camera.mp : `${p.camera.mp} MP`],
    [/\bmount\b/, (p) => p.camera.mount],
    [/\biso\b/, (p) => p.camera.iso],
    [/video|recording/, (p) => p.camera.video],
    [/stabili[sz]|\bibis\b/, (p) => p.camera.stabilization],
    [/shutter.?count|actuation/, (p) => p.camera.shutterCount],
    [/shutter/, (p) => p.camera.shutter],
    [/\blens\b/, (p) => p.camera.lens],
    [/battery/, (p) => p.camera.battery],
    [/memory.?card|card.?slot|media.?slot/, (p) => p.camera.capacity],
    [/weight/, (p, el) => objectFor(el, p).weight || `${randInt(1, 40)} lb`],
    [/(firearm|gun|weapon|vehicle|camera|item|device|equipment|product).?(type|kind|class|category)/, (p, el) => objectFor(el, p).type],
    [/model.?year|\byear\b|\byr\b/, (p, el) => objectFor(el, p).year],
    [/\bmake\b|manufactur|\bmfr\b|\bmfg\b|\bbrand\b/, (p, el) => objectFor(el, p).make],
    [/\bmodel\b(?!.?(no|num|#))/, (p, el) => objectFor(el, p).model],
    [/serial|\bs\/n\b/, (p, el) => { const o = objectFor(el, p); return o.serial || o.vin; }],
    [/capacity|mag(azine)?.?size|\brounds\b|seating|\bseats\b|storage/, (p, el) => objectFor(el, p).capacity],
    [/colou?r|\bfinish\b/, (p, el) => objectFor(el, p).color],
    [/middle.?init|\bm\.?i\.?\b/, (p) => p.middle[0] + '.'],
    [/middle.?name|\bmiddle\b/, (p) => p.middle],
    [/salary|\bincome\b|compensation|annual.?pay/, (p, el) => usdWhole(30000, 200000, el)],
    [/price|\bamount\b|\bcost\b|\bfee\b|budget|\btotal\b|subtotal|payment|\bbalance\b|revenue|\busd\b|dollar/, (p, el) => usdCents(5, 2500, el)],
    [/percent|discount|\brate\b|\btax\b/, () => String(randInt(5, 30))],
    [/quantit|\bqty\b|\bunits\b/, () => String(randInt(1, 12))],
    [/\bsku\b|part.?(no|num)|model.?(no|num)|item.?(code|no|num)/, () => `SKU-${randInt(1000, 9999)}-${pick(['A', 'B', 'K', 'X'])}${randInt(1, 9)}`],
    [/order.?(no|num|id)|invoice|confirmation|tracking|reference.?(no|num)/, () => `${pick(['ORD', 'INV', 'REF'])}-${randInt(100000, 999999)}`],
    [/product|item.?name|merchandise/, (p) => p.product],
    [/\bservice\b|\bplan\b|package|\btier\b|subscription/, (p) => p.service],
    [/department|division|\bteam\b/, () => pick(DEPARTMENTS)],
    [/industry|sector/, () => pick(INDUSTRIES)],
    [/ssn|social.?security/, () => `000-${randInt(10, 99)}-${randInt(1000, 9999)}`],
    [/subject|headline|caption/, () => loremWords(randInt(3, 6), true)],
    [/message|comment|description|bio|about|notes|feedback|summary/, () => loremSentences(2)],
    [/search|query|keyword/, () => loremWords(2)],
    [/name/, (p) => p.full]
  ];

  function isoDate(y1, y2) {
    return `${randInt(y1, y2)}-${pad2(randInt(1, 12))}-${pad2(randInt(1, 28))}`;
  }

  // USD helpers: plain digits for inputs that reject symbols (numeric/decimal
  // inputmode or a digit-only pattern), "$1,234.56" style everywhere else.
  const isNumericOnly = (el) => !!el && (el.inputMode === 'numeric' || el.inputMode === 'decimal' || /\d|0-9/.test(el.pattern || ''));

  function moneyFormat(n, el) {
    if (isNumericOnly(el)) return Number.isInteger(n) ? String(n) : n.toFixed(2);
    return '$' + n.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2
    });
  }
  const usdCents = (min, max, el) => moneyFormat(randInt(min * 100, max * 100) / 100, el);
  const usdWhole = (min, max, el) => moneyFormat(Math.round(randInt(min, max) / 500) * 500, el);

  // ------------------------------------------------------------------- helpers

  function labelTexts(el) {
    const bits = [];
    if (el.labels) for (const l of el.labels) bits.push(l.textContent);
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const root = el.getRootNode();
      for (const id of labelledBy.split(/\s+/)) {
        const n = root.getElementById && root.getElementById(id);
        if (n) bits.push(n.textContent);
      }
    }
    if (!el.labels || !el.labels.length) {
      const wrap = el.closest('label');
      if (wrap) bits.push(wrap.textContent);
    }
    return bits.filter(Boolean);
  }

  function tokensFor(el) {
    const bits = [
      el.name, el.id, el.placeholder,
      el.getAttribute('aria-label'),
      el.getAttribute('autocomplete'),
      el.getAttribute('data-testid'),
      el.title,
      ...labelTexts(el)
    ];
    // Split camelCase and snake/kebab-case so \b-bounded patterns can see
    // the words inside "totalAmount" or "unit_price".
    return bits.filter(Boolean).join(' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase();
  }

  // "Required" is detected from the required/aria-required attributes or an
  // asterisk marking the field: in its label text, rendered via CSS
  // ::before/::after (a common convention), or anywhere inside the field's
  // own wrapper — the nearest ancestors holding no other fields, so a
  // section-wide "* = required" note can't mark every field around it.
  const STAR_RE = /[*＊✱✳]/;

  function pseudoStar(node) {
    for (const pseudo of ['::before', '::after']) {
      const c = getComputedStyle(node, pseudo).content;
      if (c && STAR_RE.test(c)) return true;
    }
    return false;
  }

  function hasStarMark(node) {
    if (STAR_RE.test(node.textContent)) return true;
    return [node, ...node.querySelectorAll('*')].slice(0, 40).some(pseudoStar);
  }

  // Nearest ancestor containing no form controls besides `el` (radios of the
  // same group don't count, so a group heading's star marks the group).
  function fieldWrapper(el) {
    const sameRadioGroup = (c) => el.type === 'radio' &&
      c instanceof HTMLInputElement && c.type === 'radio' && c.name === el.name;
    let best = null;
    for (let node = el.parentElement, hops = 0; node && hops < 4; node = node.parentElement, hops++) {
      const controls = node.querySelectorAll('input:not([type="hidden"]), textarea, select, [contenteditable=""], [contenteditable="true"]');
      if (![...controls].every((c) => c === el || sameRadioGroup(c))) break;
      best = node;
      if (node.tagName === 'FORM' || node.tagName === 'BODY') break;
    }
    return best;
  }

  function isRequired(el) {
    if (el.required || el.getAttribute('aria-required') === 'true') return true;
    if (labelTexts(el).some((t) => STAR_RE.test(t))) return true;
    const labels = el.labels ? [...el.labels] : [];
    const wrap = el.closest('label');
    if (wrap) labels.push(wrap);
    if (labels.some(hasStarMark)) return true;
    const wrapper = fieldWrapper(el);
    return wrapper ? hasStarMark(wrapper) : false;
  }

  function isVisible(el) {
    if (typeof el.checkVisibility === 'function') return el.checkVisibility();
    return el.getClientRects().length > 0;
  }

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    if (el instanceof HTMLInputElement) {
      const skip = ['hidden', 'submit', 'button', 'reset', 'image', 'file'];
      if (skip.includes(el.type)) return false;
    }
    return isVisible(el);
  }

  // Set value through the native prototype setter so framework-controlled
  // inputs (React et al.) register the change.
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clampToMaxLength(el, text) {
    if (el.maxLength && el.maxLength > 0 && text.length > el.maxLength) {
      const cut = text.slice(0, el.maxLength);
      const lastPeriod = cut.lastIndexOf('.');
      return lastPeriod > el.maxLength * 0.5 ? cut.slice(0, lastPeriod + 1) : cut.trimEnd();
    }
    return text;
  }

  function flash(el) {
    const prevShadow = el.style.boxShadow;
    const prevTransition = el.style.transition;
    el.style.transition = 'box-shadow 0.15s ease';
    el.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.75)';
    setTimeout(() => {
      el.style.boxShadow = prevShadow;
      el.style.transition = prevTransition;
    }, 700);
  }

  // Collect candidate fields from the document and any open shadow roots.
  function collectFields(root, out) {
    for (const el of root.querySelectorAll('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
      out.push(el);
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) collectFields(el.shadowRoot, out);
    }
    return out;
  }

  // -------------------------------------------------------------- fill logic

  // Numeric object fields (year, mileage, barrel length, capacity) keep
  // their object's value when it fits the input's min/max/step.
  const NUMBER_HINTS = [
    [/model.?year|\byear\b|\byr\b/, (p, el) => objectFor(el, p).year],
    [/mileage|odometer|\bmiles\b/, (p) => p.vehicle.mileage],
    [/barrel/, (p) => p.firearm.barrel],
    [/megapixel|\bmp\b|resolution/, (p) => p.camera.mp],
    [/shutter.?count|actuation/, (p) => p.camera.shutterCount],
    [/capacity|mag(azine)?.?size|\brounds\b|seating|\bseats\b/, (p, el) => objectFor(el, p).capacity]
  ];

  function numberHint(el, persona) {
    const tokens = tokensFor(el);
    const hint = NUMBER_HINTS.find(([re]) => re.test(tokens));
    if (!hint) return null;
    const n = parseFloat(hint[1](persona, el));
    if (Number.isNaN(n)) return null;
    if ((el.min !== '' && n < Number(el.min)) || (el.max !== '' && n > Number(el.max))) return null;
    if (el.step !== 'any') {
      const step = Number(el.step) > 0 ? Number(el.step) : 1;
      const offset = (n - (el.min !== '' ? Number(el.min) : 0)) / step;
      if (Math.abs(offset - Math.round(offset)) > 1e-9) return null;
    }
    return String(n);
  }

  // The option a select should get to agree with the rest of the fill: the
  // one matching what a text field with the same label would hold ("Glock",
  // "9mm Luger", "CA"). A make select without our make still keeps the run
  // coherent: if it offers another make we know, the object is re-rolled as
  // that make (same year) so the model, caliber, etc. filled afterwards match.
  function matchingOption(el, persona, opts) {
    const tokens = tokensFor(el);
    const hit = TEXT_PATTERNS.find(([re]) => re.test(tokens));
    if (!hit || hit[0].source === 'name') return null;
    const norm = (t) => t.trim().toLowerCase();
    const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const find = (want) => {
      want = norm(String(want));
      if (!want) return null;
      return opts.find((o) => norm(o.text) === want || norm(o.value) === want) ||
        opts.find((o) => {
          const t = norm(o.text);
          return t.length >= 2 && (new RegExp(`(^|\\W)${esc(t)}($|\\W)`).test(want) ||
            new RegExp(`(^|\\W)${esc(want)}($|\\W)`).test(t));
        }) || null;
    };
    const found = find(hit[1](persona, el));
    if (found || !/\\bmake\\b/.test(hit[0].source)) return found;
    const obj = objectFor(el, persona);
    const [list, maker] = OBJECT_MAKERS[obj.kind];
    for (const [make] of list) {
      const o = find(make);
      if (o) { persona[obj.kind] = maker(make, obj.year); return o; }
    }
    return null;
  }

  function valueForInput(el, persona, options) {
    switch (el.type) {
      case 'email': return persona.email;
      case 'tel': return persona.phone;
      case 'url': return persona.website;
      case 'password': return persona.password;
      case 'color': return '#' + randInt(0, 0xffffff).toString(16).padStart(6, '0');
      case 'date': return /birth|dob/.test(tokensFor(el)) ? isoDate(1965, 2004) : isoDate(2024, 2026);
      case 'time': return `${pad2(randInt(8, 18))}:${pad2(randInt(0, 59))}`;
      case 'datetime-local': return `${isoDate(2024, 2026)}T${pad2(randInt(8, 18))}:${pad2(randInt(0, 59))}`;
      case 'month': return `${randInt(2024, 2026)}-${pad2(randInt(1, 12))}`;
      case 'week': return `${randInt(2024, 2026)}-W${pad2(randInt(1, 52))}`;
      case 'number':
      case 'range': {
        const hinted = numberHint(el, persona);
        if (hinted !== null) return hinted;
        const min = el.min !== '' ? Number(el.min) : 1;
        const max = el.max !== '' ? Number(el.max) : Math.max(min + 99, 100);
        const step = el.step && Number(el.step) > 0 ? Number(el.step) : 1;
        const steps = Math.floor((max - min) / step);
        return String(min + randInt(0, Math.max(steps, 0)) * step);
      }
      default: {
        const tokens = tokensFor(el);
        for (const [re, gen] of TEXT_PATTERNS) {
          if (re.test(tokens)) return gen(persona, el);
        }
        return loremWords(randInt(2, 4), true);
      }
    }
  }

  // Fill in passes: checking a radio/checkbox or picking a select option often
  // reveals conditional fields the page renders on change. After each pass
  // that filled something, wait for the page to settle and sweep again for
  // fields that appeared. `done` and `pickedRadioGroups` pin every decision so
  // later passes never refill a field or re-roll a choice — flipping a radio
  // back and forth would toggle the very sections we're trying to fill.
  const MAX_PASSES = 5;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 200));

  async function fillPage(options) {
    const persona = makePersona();
    const done = new WeakSet();
    const pickedRadioGroups = new Set();
    let filled = 0;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const n = fillOnce(persona, options, done, pickedRadioGroups);
      filled += n;
      if (n === 0) break;
      await settle();
    }
    return filled;
  }

  function fillOnce(persona, options, done, pickedRadioGroups) {
    const fields = collectFields(document, []);
    const radioGroups = new Map();
    let filled = 0;

    for (const el of fields) {
      try {
        if (done.has(el)) continue;
        // Radios are exempt: requiredness is judged per group below.
        if (options.onlyRequired && !(el instanceof HTMLInputElement && el.type === 'radio') && !isRequired(el)) continue;

        if (el instanceof HTMLInputElement) {
          if (!isFillable(el)) continue;

          if (el.type === 'checkbox') {
            done.add(el);
            if (options.onlyEmpty && el.checked) continue;
            if (el.required || Math.random() < 0.6) {
              if (!el.checked) el.click();
              flash(el); filled++;
            }
            continue;
          }
          if (el.type === 'radio') {
            const key = (el.form ? 'f' : 'd') + ' ' + el.name;
            if (pickedRadioGroups.has(key)) { done.add(el); continue; }
            if (!radioGroups.has(key)) radioGroups.set(key, []);
            radioGroups.get(key).push(el);
            continue;
          }
          if (options.onlyEmpty && el.value !== '') { done.add(el); continue; }

          const value = clampToMaxLength(el, valueForInput(el, persona, options));
          setNativeValue(el, value);
          done.add(el);
          flash(el); filled++;

        } else if (el instanceof HTMLTextAreaElement) {
          if (!isFillable(el)) continue;
          if (options.onlyEmpty && el.value !== '') { done.add(el); continue; }
          const text = clampToMaxLength(el, loremParagraphs(options.paragraphs));
          setNativeValue(el, text);
          done.add(el);
          flash(el); filled++;

        } else if (el instanceof HTMLSelectElement) {
          if (!isFillable(el)) continue;
          if (options.onlyEmpty && el.selectedIndex > 0) { done.add(el); continue; }
          const opts = Array.from(el.options).filter((o) => !o.disabled && o.value !== '');
          if (!opts.length) continue;
          if (el.multiple) {
            for (const o of el.options) o.selected = false;
            for (let i = 0; i < randInt(1, Math.min(2, opts.length)); i++) pick(opts).selected = true;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            setNativeValue(el, (matchingOption(el, persona, opts) || pick(opts)).value);
          }
          done.add(el);
          flash(el); filled++;

        } else if (el.isContentEditable) {
          if (!isVisible(el)) continue;
          if (options.onlyEmpty && el.textContent.trim() !== '') { done.add(el); continue; }
          el.textContent = loremParagraph();
          el.dispatchEvent(new Event('input', { bubbles: true }));
          done.add(el);
          flash(el); filled++;
        }
      } catch (e) {
        // One stubborn field shouldn't stop the run.
      }
    }

    for (const [key, group] of radioGroups) {
      if (options.onlyRequired && !group.some((r) => isRequired(r))) continue;
      const enabled = group.filter((r) => isFillable(r));
      if (!enabled.length) continue;
      pickedRadioGroups.add(key);
      for (const r of group) done.add(r);
      if (options.onlyEmpty && group.some((r) => r.checked)) continue;
      const choice = pick(enabled);
      if (!choice.checked) choice.click();
      flash(choice); filled++;
    }

    return filled;
  }

  // ------------------------------------------------- lorem into a single field

  let lastContextTarget = null;
  document.addEventListener('contextmenu', (e) => {
    const path = e.composedPath();
    lastContextTarget = (path && path[0]) || e.target;
  }, true);

  function loremIntoTarget(options) {
    // If we were injected after the right-click we never saw the contextmenu
    // event; the clicked field still holds focus, so fall back to it.
    const el = lastContextTarget || document.activeElement;
    if (!el) return 0;
    if (el instanceof HTMLTextAreaElement) {
      setNativeValue(el, clampToMaxLength(el, loremParagraphs(options.paragraphs)));
    } else if (el instanceof HTMLInputElement && !['checkbox', 'radio', 'hidden', 'file'].includes(el.type)) {
      setNativeValue(el, clampToMaxLength(el, loremSentence()));
    } else if (el.isContentEditable || (el.closest && el.closest('[contenteditable="true"], [contenteditable=""]'))) {
      const target = el.isContentEditable ? el : el.closest('[contenteditable="true"], [contenteditable=""]');
      target.textContent = loremParagraphs(options.paragraphs);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      return 0;
    }
    flash(el);
    return 1;
  }

  // ------------------------------------------------------------------ messages

  const DEFAULT_OPTIONS = { onlyEmpty: true, onlyRequired: false, paragraphs: 2 };

  async function resolveOptions(msg) {
    if (msg.options) return { ...DEFAULT_OPTIONS, ...msg.options };
    try {
      const stored = await chrome.storage.sync.get(DEFAULT_OPTIONS);
      return { ...DEFAULT_OPTIONS, ...stored };
    } catch (e) {
      return DEFAULT_OPTIONS;
    }
  }

  // Exposed for the popup, which runs the fill per frame via chrome.scripting
  // to get an accurate total (a broadcast sendMessage returns only the first
  // frame's response, so an empty iframe answering fast reads as "Filled 0").
  window.__formFillerFill = (opts) => fillPage({ ...DEFAULT_OPTIONS, ...(opts || {}) });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      const options = await resolveOptions(msg);
      if (msg.action === 'fillForms') {
        sendResponse({ filled: await fillPage(options) });
      } else if (msg.action === 'loremIntoTarget') {
        sendResponse({ filled: loremIntoTarget(options) });
      } else {
        sendResponse({});
      }
    })();
    return true; // keep the channel open for the async response
  });
})();
