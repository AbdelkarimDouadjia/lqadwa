import { z } from "zod";
import { cities } from "./wilayas";
export const discoveryFilterFields = {
  city: z.enum(cities.map(c=>c.id) as [string,...string[]]),
  night: z.boolean().default(false), radiusKm: z.number().min(0).max(100).optional(),
  origin: z.object({ lat: z.number().min(18.9).max(37.2), lng: z.number().min(-8.7).max(12), consent: z.literal(true) }).strict().optional(),
};
export function routingFilters(input: {city:string;night:boolean;radiusKm?:number;origin?:{lat:number;lng:number;consent:true}}) {
  return { city: input.city, night: input.night, radiusKm: input.radiusKm || undefined,
    origin: input.origin ? {lat:Math.round(input.origin.lat*1000)/1000,lng:Math.round(input.origin.lng*1000)/1000} : undefined };
}
