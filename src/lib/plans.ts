export type Plan = {
  id: string;
  name: string;
  price: number;
  days: number;
  dailyLimit: number;
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  { id: "semanal", name: "Plano Semanal", price: 150, days: 7, dailyLimit: 2 },
  { id: "quinzenal", name: "Plano 14 dias", price: 250, days: 14, dailyLimit: 4, highlight: true },
  { id: "mensal", name: "Plano 30 dias", price: 400, days: 30, dailyLimit: 10 },
];

export const PAYMENT_METHODS = [
  { id: "emola", name: "Emola", number: "872954503", holder: "Laura Ermelindo" },
  { id: "mpesa", name: "M-Pesa", number: "851589567", holder: "JEREMIAS NIUONENO ROMAO" },
];

export const FREE_DAILY_LIMIT = 0;


export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
