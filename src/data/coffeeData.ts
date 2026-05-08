import { CoffeeBean, Brand } from '../types';

export const COFFEE_BEANS: CoffeeBean[] = [
  {
    id: 'ethiopia-yirgacheffe',
    name: 'Ethiopia Yirgacheffe G1 Washed',
    origin: 'Ethiopia',
    region: 'Yirgacheffe',
    processing: 'Washed',
    roastLevel: 'Light',
    acidity: 5,
    body: 2,
    sweetness: 4,
    bitterness: 1,
    flavorNotes: ['Lemon', 'Floral', 'Bergamot', 'Jasmine'],
    description: 'A classic specialty coffee known for its bright, tea-like acidity and intense floral aroma.',
    brewingGuide: 'Best brewed with Hario V60 at 92°C with a 1:15 ratio.',
    foodPairing: [
      { name: 'Lemon Tart', type: 'Dessert', description: 'The bright citrus notes of the coffee complement the tartness of the lemon.' },
      { name: 'Butter Croissant', type: 'Bread', description: 'The light, flaky texture balances the tea-like body of Yirgacheffe.' }
    ]
  },
  {
    id: 'brazil-cerrado',
    name: 'Brazil Cerrado NY2',
    origin: 'Brazil',
    region: 'Cerrado',
    processing: 'Natural',
    roastLevel: 'Medium',
    acidity: 2,
    body: 4,
    sweetness: 4,
    bitterness: 3,
    flavorNotes: ['Chocolate', 'Nutty', 'Caramel'],
    description: 'A balanced and approachable coffee with low acidity and a heavy chocolatey finish.',
    brewingGuide: 'Excellent for both espresso and drip. Try 90°C for a smoother finish.',
    foodPairing: [
      { name: 'Chocolate Brownie', type: 'Cake', description: 'Enhances the chocolatey and nutty profile of the Brazil bean.' },
      { name: 'Almond Biscotti', type: 'Cookie', description: 'The crunch and nuttiness pair perfectly with the coffee\'s body.' }
    ]
  },
  {
    id: 'colombia-huila',
    name: 'Colombia Huila Supremo',
    origin: 'Colombia',
    region: 'Huila',
    processing: 'Washed',
    roastLevel: 'Medium',
    acidity: 3,
    body: 3,
    sweetness: 5,
    bitterness: 2,
    flavorNotes: ['Caramel', 'Orange', 'Nutty'],
    description: 'The definition of a balanced "mild" coffee. Sweet, clean, and versatile.',
    brewingGuide: 'Works well with any brewing method. 91°C is recommended.',
    foodPairing: [
      { name: 'Orange Pound Cake', type: 'Cake', description: 'Matches the subtle citrus acidity of the Huila bean.' },
      { name: 'Salted Caramel Cookie', type: 'Cookie', description: 'Complements the natural sweetness and caramel notes.' }
    ]
  },
  {
    id: 'guatemala-antigua',
    name: 'Guatemala Antigua Pastoral',
    origin: 'Guatemala',
    region: 'Antigua',
    processing: 'Washed',
    roastLevel: 'Dark',
    acidity: 2,
    body: 5,
    sweetness: 3,
    bitterness: 4,
    flavorNotes: ['Smoky', 'Dark Chocolate', 'Spice'],
    description: 'Grown in volcanic soil, this coffee offers a unique smoky aroma and rich chocolate depth.',
    brewingGuide: 'Great for French Press or Moka Pot to highlight its heavy body.',
    foodPairing: [
      { name: 'Dark Chocolate Ganache', type: 'Dessert', description: 'Pairs with the smoky and spicy chocolate notes.' },
      { name: 'Cinnamon Roll', type: 'Bread', description: 'The spice in the coffee matches the cinnamon warmth.' }
    ]
  },
  {
    id: 'el-paraiso-anaerobic',
    name: 'Colombia El Paraiso Lychee Anaerobic',
    origin: 'Colombia',
    region: 'Cauca',
    processing: 'Anaerobic',
    roastLevel: 'Light',
    acidity: 5,
    body: 3,
    sweetness: 5,
    bitterness: 1,
    flavorNotes: ['Lychee', 'Peach', 'Yogurt', 'Floral'],
    description: 'An explosive flavor profile created by double anaerobic fermentation. Tastes like fruit juice.',
    brewingGuide: 'Brew with a slightly coarser grind at 88-90°C to maintain clarity.',
    foodPairing: [
      { name: 'Peach Macaron', type: 'Cookie', description: 'The delicate peach flavor mirrors the coffee\'s notes.' },
      { name: 'Cheesecake', type: 'Cake', description: 'The creamy texture and slight tang pair with the yogurt-like acidity.' }
    ]
  },
  {
    id: 'indonesia-mandheling',
    name: 'Indonesia Sumatra Mandheling G1',
    origin: 'Indonesia',
    region: 'Sumatra',
    processing: 'Natural',
    roastLevel: 'Dark',
    acidity: 1,
    body: 5,
    sweetness: 2,
    bitterness: 5,
    flavorNotes: ['Earthy', 'Herbal', 'Dark Chocolate'],
    description: 'Heavy-bodied and low-acid with a unique earthy profile from the Giling Basah process.',
    brewingGuide: 'Perfect for those who love a bold, punchy cup. Use 93°C water.',
    foodPairing: [
      { name: 'Tiramisu', type: 'Cake', description: 'The coffee-soaked layers match the bold Sumatra profile.' },
      { name: 'Rye Bread', type: 'Bread', description: 'The earthy, hearty bread stands up to the heavy body.' }
    ]
  }
];

export const BRANDS: Brand[] = [
  {
    id: 'blue-bottle',
    name: 'Blue Bottle Coffee',
    beans: ['ethiopia-yirgacheffe', 'colombia-huila'],
    website: 'https://bluebottlecoffee.com',
    description: 'A leader in the third-wave coffee movement, focusing on freshness and delicate flavor profiles.'
  },
  {
    id: 'starbucks',
    name: 'Starbucks',
    beans: ['brazil-cerrado', 'guatemala-antigua'],
    website: 'https://starbucks.com',
    description: 'The world\'s largest coffee chain, offering consistent roasts from Blonde to Dark.'
  },
  {
    id: 'momos-coffee',
    name: 'Momos Coffee',
    beans: ['el-paraiso-anaerobic', 'ethiopia-yirgacheffe'],
    website: 'https://momoscoffee.com',
    description: 'A renowned Korean specialty roastery, home to world barista champions.'
  },
  {
    id: 'peets-coffee',
    name: 'Peet\'s Coffee',
    beans: ['indonesia-mandheling', 'guatemala-antigua'],
    website: 'https://peets.com',
    description: 'The pioneer of dark roasting in the US, known for bold and smoky profiles.'
  }
];
