export type ProcessingMethod = 'Washed' | 'Natural' | 'Anaerobic' | 'Honey' | 'Carbonic Maceration' | 'Thermal Shock';
export type RoastLevel = 'Light' | 'Medium' | 'Dark';
export type BodyType = 'Light' | 'Medium' | 'Heavy';
export type Equipment = 'Hand Drip' | 'Capsule' | 'Espresso Machine' | 'Moka Pot' | 'French Press';
export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export type PhysicalCondition = 'Tired' | 'Focused' | 'Relaxed' | 'Refreshing';
export type WeatherType = 'Sunny' | 'Rainy' | 'Cloudy' | 'Snowy' | 'Hot' | 'Cold';
export type HealthStatus = 'None' | 'CaffeineSensitive' | 'StomachSensitive' | 'Diabetes' | 'HighCholesterol';
export type MusicGenre = 'Pop' | 'Rock' | 'Hip Hop' | 'Jazz' | 'Classical' | 'EDM' | 'R&B' | 'Country' | 'Reggae' | 'K-pop' | 'Any';
export type MilkPreference = 'Black' | 'Milk' | 'Oat';
export type ExperienceLevel = 'Beginner' | 'Daily' | 'Enthusiast';
export type BudgetOption = 'Daily' | 'Specialty';

export interface FlavorNote {
  id: string;
  label: string;
  category: 'Nutty' | 'Floral' | 'Unique';
}

export interface CoffeeBean {
  id: string;
  name: string;
  origin: string;
  region: string;
  processing: ProcessingMethod;
  roastLevel: RoastLevel;
  acidity: number; // 1-5
  body: number; // 1-5
  sweetness: number; // 1-5
  bitterness: number; // 1-5
  flavorNotes: string[];
  description: string;
  brewingGuide: string;
  foodPairing: {
    name: string;
    type: 'Bread' | 'Cake' | 'Cookie' | 'Dessert';
    description: string;
  }[];
}

export interface Brand {
  id: string;
  name: string;
  beans: string[]; // IDs of CoffeeBeans
  website: string;
  description: string;
}

export interface UserPreferences {
  base: 'Espresso' | 'Drip';
  caffeine: 'Regular' | 'Decaf';
  equipment: Equipment;
  flavorNotes: string[];
  tasteAcidity: number;
  tasteSweetness: number;
  tasteBitterness: number;
  tasteBody: number;
  season: Season;
  timeOfDay: TimeOfDay;
  condition: PhysicalCondition;
  weather: WeatherType;
  healthStatus: HealthStatus;
  musicGenre: MusicGenre;
  music?: MusicGenre;
  milkPreference: MilkPreference;
  roastLevel: RoastLevel;
  experienceLevel: ExperienceLevel;
  budget: BudgetOption;
  includeMapSearch?: boolean;
}
