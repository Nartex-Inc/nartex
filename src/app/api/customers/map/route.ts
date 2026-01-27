// src/app/api/customers/map/route.ts
// Uses postal code estimation from ZipCode column - no geocoding required

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// Roles allowed to access map data
const ALLOWED_USER_ROLES = [
  "gestionnaire",
  "admin",
  "ventes-exec",
  "ventes_exec",
  "facturation",
  "expert",
];

const BYPASS_EMAILS = ["n.labranche@sinto.ca"];

// =============================================================================
// QUEBEC POSTAL CODE CENTROIDS
// Maps first 3 characters of postal code to approximate lat/lng
// =============================================================================
const POSTAL_CENTROIDS: Record<string, { lat: number; lng: number; city: string }> = {
  // Quebec City region (G1)
  "G1A": { lat: 46.8088, lng: -71.2150, city: "Québec" },
  "G1B": { lat: 46.8619, lng: -71.1803, city: "Québec" },
  "G1C": { lat: 46.8789, lng: -71.1578, city: "Québec" },
  "G1E": { lat: 46.8503, lng: -71.1314, city: "Québec" },
  "G1G": { lat: 46.8356, lng: -71.2850, city: "Québec" },
  "G1H": { lat: 46.8067, lng: -71.2556, city: "Québec" },
  "G1J": { lat: 46.8167, lng: -71.2167, city: "Québec" },
  "G1K": { lat: 46.8139, lng: -71.2082, city: "Québec" },
  "G1L": { lat: 46.8089, lng: -71.2236, city: "Québec" },
  "G1M": { lat: 46.7878, lng: -71.2472, city: "Québec" },
  "G1N": { lat: 46.7739, lng: -71.2794, city: "Québec" },
  "G1P": { lat: 46.7631, lng: -71.3144, city: "Québec" },
  "G1R": { lat: 46.8103, lng: -71.2075, city: "Québec" },
  "G1S": { lat: 46.7767, lng: -71.2319, city: "Québec" },
  "G1T": { lat: 46.7733, lng: -71.2706, city: "Québec" },
  "G1V": { lat: 46.7772, lng: -71.2644, city: "Québec" },
  "G1W": { lat: 46.7608, lng: -71.2839, city: "Québec" },
  "G1X": { lat: 46.7533, lng: -71.3139, city: "Québec" },
  "G1Y": { lat: 46.7456, lng: -71.3461, city: "Québec" },
  
  // Quebec City region (G2)
  "G2A": { lat: 46.8789, lng: -71.2567, city: "Québec" },
  "G2B": { lat: 46.8972, lng: -71.2494, city: "Québec" },
  "G2C": { lat: 46.9125, lng: -71.2350, city: "Québec" },
  "G2E": { lat: 46.8444, lng: -71.3000, city: "Québec" },
  "G2G": { lat: 46.8667, lng: -71.3167, city: "Québec" },
  "G2J": { lat: 46.8908, lng: -71.2897, city: "Québec" },
  "G2K": { lat: 46.9069, lng: -71.2758, city: "Québec" },
  "G2L": { lat: 46.9206, lng: -71.2653, city: "Québec" },
  "G2M": { lat: 46.9342, lng: -71.2547, city: "Québec" },
  "G2N": { lat: 46.9128, lng: -71.2056, city: "Québec" },
  
  // Lévis region (G3)
  "G3A": { lat: 46.7189, lng: -71.2392, city: "Lévis" },
  "G3B": { lat: 46.7325, lng: -71.2183, city: "Lévis" },
  "G3C": { lat: 46.7475, lng: -71.1933, city: "Lévis" },
  "G3E": { lat: 46.7150, lng: -71.1483, city: "Lévis" },
  "G3G": { lat: 46.7317, lng: -71.1350, city: "Lévis" },
  "G3H": { lat: 46.7517, lng: -71.1183, city: "Lévis" },
  "G3J": { lat: 46.7167, lng: -71.0850, city: "Lévis" },
  "G3K": { lat: 46.7000, lng: -71.1333, city: "Lévis" },
  "G3L": { lat: 46.7189, lng: -71.1683, city: "Lévis" },
  "G3M": { lat: 46.6839, lng: -71.0917, city: "Lévis" },
  "G3N": { lat: 46.6500, lng: -71.1500, city: "Lévis" },
  "G3Z": { lat: 46.6333, lng: -71.0333, city: "Lévis" },
  
  // Beauce region (G4/G5/G6)
  "G4R": { lat: 46.1167, lng: -70.6667, city: "Thetford Mines" },
  "G4T": { lat: 46.0500, lng: -70.5000, city: "Lac-Mégantic" },
  "G4V": { lat: 46.0833, lng: -70.8333, city: "St-Georges" },
  "G4W": { lat: 46.0167, lng: -70.4167, city: "Lac-Mégantic" },
  "G4X": { lat: 46.0000, lng: -70.3333, city: "Lac-Mégantic" },
  "G4Z": { lat: 46.1500, lng: -70.7500, city: "Thetford Mines" },
  "G5A": { lat: 46.3500, lng: -72.5500, city: "La Tuque" },
  "G5B": { lat: 46.3000, lng: -72.7833, city: "Shawinigan" },
  "G5C": { lat: 46.5500, lng: -72.7333, city: "Shawinigan" },
  "G5H": { lat: 46.5667, lng: -72.7500, city: "Shawinigan" },
  "G5J": { lat: 46.1000, lng: -70.9500, city: "St-Georges" },
  "G5L": { lat: 46.0500, lng: -70.9000, city: "St-Georges" },
  "G5M": { lat: 46.1500, lng: -70.8500, city: "Beauceville" },
  "G5N": { lat: 46.2000, lng: -70.8000, city: "Beauceville" },
  "G5R": { lat: 46.4167, lng: -70.5500, city: "Montmagny" },
  "G5T": { lat: 46.3500, lng: -70.5833, city: "Montmagny" },
  "G5V": { lat: 46.9833, lng: -70.9500, city: "Montmagny" },
  "G5X": { lat: 46.3833, lng: -70.7833, city: "Ste-Marie" },
  "G5Y": { lat: 46.4333, lng: -71.0167, city: "Ste-Marie" },
  "G5Z": { lat: 46.4167, lng: -71.0500, city: "Ste-Marie" },
  "G6A": { lat: 46.4500, lng: -71.2333, city: "Scott" },
  "G6B": { lat: 46.3833, lng: -70.5500, city: "Montmagny" },
  "G6C": { lat: 46.5333, lng: -71.2000, city: "St-Nicolas" },
  "G6E": { lat: 46.6167, lng: -71.3167, city: "St-Étienne" },
  "G6G": { lat: 46.5833, lng: -71.4500, city: "St-Apollinaire" },
  "G6H": { lat: 46.5500, lng: -71.2500, city: "St-Rédempteur" },
  "G6J": { lat: 46.6000, lng: -71.3833, city: "St-Nicolas" },
  "G6K": { lat: 46.5833, lng: -71.3500, city: "St-Nicolas" },
  "G6L": { lat: 46.7667, lng: -71.4333, city: "St-Augustin" },
  "G6P": { lat: 46.6167, lng: -71.9167, city: "Plessisville" },
  "G6R": { lat: 46.4833, lng: -71.8167, city: "Victoriaville" },
  "G6S": { lat: 46.5333, lng: -71.9500, city: "Victoriaville" },
  "G6T": { lat: 46.5000, lng: -71.9667, city: "Victoriaville" },
  "G6V": { lat: 46.0667, lng: -71.3000, city: "St-Joseph" },
  "G6W": { lat: 46.7333, lng: -71.2500, city: "Lévis" },
  "G6X": { lat: 46.6667, lng: -71.1667, city: "Lévis" },
  "G6Y": { lat: 46.6000, lng: -71.1167, city: "Lévis" },
  "G6Z": { lat: 46.6833, lng: -71.1500, city: "Lévis" },
  
  // Saguenay region (G7)
  "G7A": { lat: 48.3333, lng: -70.8667, city: "La Baie" },
  "G7B": { lat: 48.4050, lng: -71.0650, city: "Chicoutimi" },
  "G7G": { lat: 48.4230, lng: -71.0520, city: "Chicoutimi" },
  "G7H": { lat: 48.4280, lng: -71.0680, city: "Chicoutimi" },
  "G7J": { lat: 48.4160, lng: -71.0850, city: "Chicoutimi" },
  "G7K": { lat: 48.4290, lng: -71.0450, city: "Chicoutimi" },
  "G7N": { lat: 48.3380, lng: -70.8750, city: "La Baie" },
  "G7P": { lat: 48.4450, lng: -71.2350, city: "Jonquière" },
  "G7S": { lat: 48.4280, lng: -71.2480, city: "Jonquière" },
  "G7T": { lat: 48.4150, lng: -71.2620, city: "Jonquière" },
  "G7X": { lat: 48.4520, lng: -71.1980, city: "Jonquière" },
  "G7Y": { lat: 48.4680, lng: -71.1750, city: "Jonquière" },
  "G7Z": { lat: 48.4350, lng: -71.2150, city: "Jonquière" },
  
  // Lac-St-Jean region (G8)
  "G8A": { lat: 48.4890, lng: -71.1450, city: "Kénogami" },
  "G8B": { lat: 48.5520, lng: -71.6480, city: "Alma" },
  "G8C": { lat: 48.5280, lng: -71.6250, city: "Alma" },
  "G8E": { lat: 48.5750, lng: -71.6120, city: "Alma" },
  "G8G": { lat: 48.5980, lng: -71.5850, city: "Alma" },
  "G8H": { lat: 48.5667, lng: -71.2500, city: "St-Bruno" },
  "G8J": { lat: 48.5000, lng: -71.2333, city: "Hébertville" },
  "G8K": { lat: 48.4333, lng: -71.7000, city: "St-Félicien" },
  "G8L": { lat: 48.8500, lng: -72.4500, city: "Dolbeau" },
  "G8M": { lat: 48.8833, lng: -72.2333, city: "Mistassini" },
  "G8N": { lat: 48.7500, lng: -72.2167, city: "St-Félicien" },
  "G8P": { lat: 48.6500, lng: -72.0167, city: "Roberval" },
  
  // Trois-Rivières region (G8T-G9)
  "G8T": { lat: 46.3500, lng: -72.5500, city: "Trois-Rivières" },
  "G8V": { lat: 46.3417, lng: -72.5333, city: "Trois-Rivières" },
  "G8W": { lat: 46.3333, lng: -72.5167, city: "Trois-Rivières" },
  "G8Y": { lat: 46.3250, lng: -72.5667, city: "Trois-Rivières" },
  "G8Z": { lat: 46.3417, lng: -72.5833, city: "Trois-Rivières" },
  "G9A": { lat: 46.3583, lng: -72.5500, city: "Trois-Rivières" },
  "G9B": { lat: 46.3333, lng: -72.6000, city: "Trois-Rivières" },
  "G9C": { lat: 46.3167, lng: -72.6333, city: "Cap-de-la-Madeleine" },
  "G9H": { lat: 46.3500, lng: -72.6667, city: "St-Louis-de-France" },
  "G9N": { lat: 46.2833, lng: -72.7000, city: "Bécancour" },
  "G9P": { lat: 46.4000, lng: -72.8833, city: "Grand-Mère" },
  "G9R": { lat: 46.5333, lng: -72.7333, city: "Shawinigan" },
  "G9T": { lat: 46.5667, lng: -72.7500, city: "Shawinigan" },
  "G9X": { lat: 46.6333, lng: -72.9667, city: "La Tuque" },
  
  // Montreal region (H)
  "H1A": { lat: 45.6500, lng: -73.5167, city: "Pointe-aux-Trembles" },
  "H1B": { lat: 45.6333, lng: -73.5000, city: "Pointe-aux-Trembles" },
  "H1C": { lat: 45.6167, lng: -73.5167, city: "Pointe-aux-Trembles" },
  "H1E": { lat: 45.6333, lng: -73.5500, city: "Rivière-des-Prairies" },
  "H1G": { lat: 45.6000, lng: -73.5833, city: "Montréal-Nord" },
  "H1H": { lat: 45.5833, lng: -73.6167, city: "Montréal-Nord" },
  "H1J": { lat: 45.6000, lng: -73.5333, city: "Anjou" },
  "H1K": { lat: 45.5833, lng: -73.5500, city: "Anjou" },
  "H1L": { lat: 45.5833, lng: -73.5333, city: "Mercier" },
  "H1M": { lat: 45.5667, lng: -73.5500, city: "Mercier" },
  "H1N": { lat: 45.5500, lng: -73.5667, city: "Mercier" },
  "H1P": { lat: 45.6167, lng: -73.6000, city: "St-Léonard" },
  "H1R": { lat: 45.5833, lng: -73.5833, city: "St-Léonard" },
  "H1S": { lat: 45.5667, lng: -73.6000, city: "St-Léonard" },
  "H1T": { lat: 45.5500, lng: -73.6000, city: "Rosemont" },
  "H1V": { lat: 45.5333, lng: -73.5500, city: "Hochelaga" },
  "H1W": { lat: 45.5333, lng: -73.5667, city: "Hochelaga" },
  "H1X": { lat: 45.5333, lng: -73.5833, city: "Rosemont" },
  "H1Y": { lat: 45.5333, lng: -73.6000, city: "Rosemont" },
  "H1Z": { lat: 45.5500, lng: -73.6333, city: "Villeray" },
  "H2A": { lat: 45.5333, lng: -73.6167, city: "Villeray" },
  "H2B": { lat: 45.5500, lng: -73.6500, city: "Ahuntsic" },
  "H2C": { lat: 45.5500, lng: -73.6667, city: "Ahuntsic" },
  "H2E": { lat: 45.5333, lng: -73.6333, city: "Villeray" },
  "H2G": { lat: 45.5333, lng: -73.5917, city: "Petite-Patrie" },
  "H2H": { lat: 45.5250, lng: -73.5750, city: "Plateau" },
  "H2J": { lat: 45.5250, lng: -73.5667, city: "Plateau" },
  "H2K": { lat: 45.5250, lng: -73.5500, city: "Centre-Sud" },
  "H2L": { lat: 45.5167, lng: -73.5583, city: "Centre-Sud" },
  "H2M": { lat: 45.5500, lng: -73.6583, city: "Ahuntsic" },
  "H2N": { lat: 45.5583, lng: -73.6500, city: "Ahuntsic" },
  "H2P": { lat: 45.5417, lng: -73.6333, city: "Parc-Extension" },
  "H2R": { lat: 45.5333, lng: -73.6250, city: "Parc-Extension" },
  "H2S": { lat: 45.5250, lng: -73.6167, city: "Petite-Patrie" },
  "H2T": { lat: 45.5250, lng: -73.5833, city: "Plateau" },
  "H2V": { lat: 45.5167, lng: -73.6083, city: "Outremont" },
  "H2W": { lat: 45.5167, lng: -73.5833, city: "Plateau" },
  "H2X": { lat: 45.5083, lng: -73.5750, city: "Quartier Latin" },
  "H2Y": { lat: 45.5083, lng: -73.5583, city: "Vieux-Montréal" },
  "H2Z": { lat: 45.5083, lng: -73.5667, city: "Centre-Ville" },
  "H3A": { lat: 45.5042, lng: -73.5772, city: "Centre-Ville" },
  "H3B": { lat: 45.5017, lng: -73.5673, city: "Centre-Ville" },
  "H3C": { lat: 45.4917, lng: -73.5583, city: "Griffintown" },
  "H3E": { lat: 45.4667, lng: -73.5333, city: "Île-des-Sœurs" },
  "H3G": { lat: 45.4917, lng: -73.5833, city: "Centre-Ville" },
  "H3H": { lat: 45.4833, lng: -73.5917, city: "Westmount" },
  "H3J": { lat: 45.4833, lng: -73.5667, city: "Petite-Bourgogne" },
  "H3K": { lat: 45.4833, lng: -73.5500, city: "Pointe-St-Charles" },
  "H3L": { lat: 45.5583, lng: -73.6667, city: "Cartierville" },
  "H3M": { lat: 45.5500, lng: -73.6833, city: "Cartierville" },
  "H3N": { lat: 45.5417, lng: -73.6583, city: "Parc-Extension" },
  "H3P": { lat: 45.4917, lng: -73.6500, city: "Mont-Royal" },
  "H3R": { lat: 45.4917, lng: -73.6333, city: "Mont-Royal" },
  "H3S": { lat: 45.4833, lng: -73.6333, city: "Côte-des-Neiges" },
  "H3T": { lat: 45.4917, lng: -73.6167, city: "Côte-des-Neiges" },
  "H3V": { lat: 45.4917, lng: -73.6000, city: "Outremont" },
  "H3W": { lat: 45.4833, lng: -73.6167, city: "Côte-des-Neiges" },
  "H3X": { lat: 45.4750, lng: -73.6500, city: "Hampstead" },
  "H3Y": { lat: 45.4833, lng: -73.5833, city: "Westmount" },
  "H3Z": { lat: 45.4833, lng: -73.5917, city: "Westmount" },
  "H4A": { lat: 45.4667, lng: -73.5917, city: "NDG" },
  "H4B": { lat: 45.4583, lng: -73.6000, city: "NDG" },
  "H4C": { lat: 45.4583, lng: -73.5833, city: "St-Henri" },
  "H4E": { lat: 45.4500, lng: -73.5833, city: "Verdun" },
  "H4G": { lat: 45.4583, lng: -73.5750, city: "Verdun" },
  "H4H": { lat: 45.4417, lng: -73.6083, city: "Verdun" },
  "H4J": { lat: 45.5000, lng: -73.6667, city: "St-Laurent" },
  "H4K": { lat: 45.5083, lng: -73.6833, city: "St-Laurent" },
  "H4L": { lat: 45.5167, lng: -73.6750, city: "St-Laurent" },
  "H4M": { lat: 45.5000, lng: -73.7083, city: "St-Laurent" },
  "H4N": { lat: 45.5000, lng: -73.6917, city: "St-Laurent" },
  "H4P": { lat: 45.4917, lng: -73.6583, city: "Mont-Royal" },
  "H4R": { lat: 45.4750, lng: -73.7000, city: "St-Laurent" },
  "H4S": { lat: 45.4750, lng: -73.6833, city: "St-Laurent" },
  "H4T": { lat: 45.4750, lng: -73.6667, city: "St-Laurent" },
  "H4V": { lat: 45.4583, lng: -73.6167, city: "NDG" },
  "H4W": { lat: 45.4583, lng: -73.6333, city: "Côte-St-Luc" },
  "H4X": { lat: 45.4500, lng: -73.6250, city: "NDG" },
  "H4Y": { lat: 45.4667, lng: -73.6083, city: "NDG" },
  "H4Z": { lat: 45.5000, lng: -73.5667, city: "Centre-Ville" },
  "H5A": { lat: 45.5000, lng: -73.5583, city: "Centre-Ville" },
  "H5B": { lat: 45.5083, lng: -73.5667, city: "Centre-Ville" },
  "H7A": { lat: 45.5667, lng: -73.6333, city: "Laval" },
  "H7B": { lat: 45.5750, lng: -73.6417, city: "Laval" },
  "H7C": { lat: 45.5833, lng: -73.6500, city: "Laval" },
  "H7E": { lat: 45.5583, lng: -73.6833, city: "Laval" },
  "H7G": { lat: 45.5667, lng: -73.7000, city: "Laval" },
  "H7H": { lat: 45.5750, lng: -73.7167, city: "Laval" },
  "H7J": { lat: 45.5833, lng: -73.7333, city: "Laval" },
  "H7K": { lat: 45.5500, lng: -73.7167, city: "Laval" },
  "H7L": { lat: 45.5583, lng: -73.7333, city: "Laval" },
  "H7M": { lat: 45.5667, lng: -73.7500, city: "Laval" },
  "H7N": { lat: 45.5417, lng: -73.7500, city: "Laval" },
  "H7P": { lat: 45.5500, lng: -73.7667, city: "Laval" },
  "H7R": { lat: 45.5583, lng: -73.7833, city: "Laval" },
  "H7S": { lat: 45.5250, lng: -73.7417, city: "Laval" },
  "H7T": { lat: 45.5333, lng: -73.7583, city: "Laval" },
  "H7V": { lat: 45.5417, lng: -73.7750, city: "Laval" },
  "H7W": { lat: 45.5500, lng: -73.7917, city: "Laval" },
  "H7X": { lat: 45.5083, lng: -73.7500, city: "Laval" },
  "H7Y": { lat: 45.5167, lng: -73.7667, city: "Laval" },
  "H8N": { lat: 45.4333, lng: -73.7500, city: "LaSalle" },
  "H8P": { lat: 45.4250, lng: -73.7333, city: "LaSalle" },
  "H8R": { lat: 45.4417, lng: -73.7000, city: "LaSalle" },
  "H8S": { lat: 45.4500, lng: -73.6833, city: "Lachine" },
  "H8T": { lat: 45.4583, lng: -73.7000, city: "Lachine" },
  "H8Y": { lat: 45.4750, lng: -73.7833, city: "Dorval" },
  "H8Z": { lat: 45.4667, lng: -73.7667, city: "Dorval" },
  "H9A": { lat: 45.4500, lng: -73.7500, city: "Dorval" },
  "H9B": { lat: 45.4583, lng: -73.7833, city: "Dorval" },
  "H9C": { lat: 45.4333, lng: -73.8000, city: "Pointe-Claire" },
  "H9E": { lat: 45.4500, lng: -73.8333, city: "Pointe-Claire" },
  "H9G": { lat: 45.4833, lng: -73.8167, city: "Pierrefonds" },
  "H9H": { lat: 45.4750, lng: -73.8500, city: "Pierrefonds" },
  "H9J": { lat: 45.4583, lng: -73.8667, city: "Pierrefonds" },
  "H9K": { lat: 45.5000, lng: -73.8500, city: "Pierrefonds" },
  "H9P": { lat: 45.4417, lng: -73.8833, city: "Kirkland" },
  "H9R": { lat: 45.4500, lng: -73.8167, city: "Pointe-Claire" },
  "H9S": { lat: 45.4333, lng: -73.9333, city: "Ste-Anne-de-Bellevue" },
  "H9W": { lat: 45.4167, lng: -73.9500, city: "Ste-Anne-de-Bellevue" },
  "H9X": { lat: 45.4500, lng: -73.9500, city: "Baie-d'Urfé" },
  
  // South Shore (J3/J4/J5)
  "J3B": { lat: 45.3500, lng: -73.2667, city: "St-Hyacinthe" },
  "J3E": { lat: 45.3833, lng: -73.3000, city: "St-Hyacinthe" },
  "J3G": { lat: 45.3667, lng: -73.3167, city: "St-Hyacinthe" },
  "J3H": { lat: 45.3333, lng: -73.3500, city: "St-Hyacinthe" },
  "J3L": { lat: 45.5000, lng: -73.4500, city: "Chambly" },
  "J3M": { lat: 45.4500, lng: -73.3000, city: "Chambly" },
  "J3N": { lat: 45.4833, lng: -73.4000, city: "Carignan" },
  "J3V": { lat: 45.5333, lng: -73.3833, city: "Beloeil" },
  "J3X": { lat: 45.5833, lng: -73.3500, city: "Mont-St-Hilaire" },
  "J3Y": { lat: 45.5000, lng: -73.4333, city: "St-Bruno" },
  "J3Z": { lat: 45.4667, lng: -73.3667, city: "Chambly" },
  "J4B": { lat: 45.5167, lng: -73.4833, city: "Boucherville" },
  "J4G": { lat: 45.5250, lng: -73.4500, city: "Boucherville" },
  "J4H": { lat: 45.5333, lng: -73.5000, city: "Longueuil" },
  "J4J": { lat: 45.5417, lng: -73.4833, city: "Longueuil" },
  "J4K": { lat: 45.5250, lng: -73.5167, city: "Longueuil" },
  "J4L": { lat: 45.4917, lng: -73.4667, city: "St-Hubert" },
  "J4M": { lat: 45.4833, lng: -73.4833, city: "Greenfield Park" },
  "J4N": { lat: 45.4750, lng: -73.5000, city: "Longueuil" },
  "J4P": { lat: 45.4583, lng: -73.4917, city: "Longueuil" },
  "J4R": { lat: 45.4500, lng: -73.4750, city: "St-Hubert" },
  "J4S": { lat: 45.4417, lng: -73.4917, city: "St-Hubert" },
  "J4T": { lat: 45.4583, lng: -73.4583, city: "St-Hubert" },
  "J4V": { lat: 45.4500, lng: -73.5083, city: "Longueuil" },
  "J4W": { lat: 45.4667, lng: -73.5000, city: "Longueuil" },
  "J4X": { lat: 45.4833, lng: -73.5167, city: "Brossard" },
  "J4Y": { lat: 45.5083, lng: -73.5083, city: "Longueuil" },
  "J4Z": { lat: 45.5000, lng: -73.5000, city: "Longueuil" },
  "J5A": { lat: 45.4667, lng: -73.5500, city: "La Prairie" },
  "J5B": { lat: 45.4167, lng: -73.5000, city: "La Prairie" },
  "J5C": { lat: 45.3833, lng: -73.5167, city: "Candiac" },
  "J5J": { lat: 45.4333, lng: -73.5333, city: "St-Constant" },
  "J5K": { lat: 45.3500, lng: -73.5833, city: "Ste-Catherine" },
  "J5L": { lat: 45.3000, lng: -73.6000, city: "Châteauguay" },
  "J5R": { lat: 45.4167, lng: -73.4500, city: "Brossard" },
  "J5T": { lat: 45.4333, lng: -73.4833, city: "Brossard" },
  "J5V": { lat: 45.4500, lng: -73.4167, city: "Brossard" },
  "J5W": { lat: 45.4667, lng: -73.4000, city: "Brossard" },
  "J5X": { lat: 45.4833, lng: -73.4167, city: "Brossard" },
  
  // Laurentides (J0/J5/J6/J7/J8)
  "J5Y": { lat: 45.7667, lng: -74.0000, city: "St-Jérôme" },
  "J5Z": { lat: 45.7833, lng: -74.0167, city: "St-Jérôme" },
  "J6A": { lat: 45.5500, lng: -74.0000, city: "St-Eustache" },
  "J6E": { lat: 45.8000, lng: -73.9833, city: "St-Jérôme" },
  "J6J": { lat: 45.5667, lng: -73.8500, city: "Deux-Montagnes" },
  "J6K": { lat: 45.5500, lng: -73.8833, city: "Deux-Montagnes" },
  "J6N": { lat: 45.5167, lng: -73.8833, city: "Rosemère" },
  "J6R": { lat: 45.5167, lng: -73.8333, city: "Blainville" },
  "J6S": { lat: 45.5333, lng: -73.8167, city: "Ste-Thérèse" },
  "J6T": { lat: 45.5167, lng: -73.8500, city: "Boisbriand" },
  "J6V": { lat: 45.5333, lng: -73.8500, city: "Lorraine" },
  "J6W": { lat: 45.5667, lng: -73.9167, city: "Mirabel" },
  "J6X": { lat: 45.6167, lng: -74.0000, city: "Mirabel" },
  "J6Y": { lat: 45.6500, lng: -73.9833, city: "Mirabel" },
  "J6Z": { lat: 45.5833, lng: -73.9500, city: "Mirabel" },
  "J7A": { lat: 45.5667, lng: -73.7833, city: "Terrebonne" },
  "J7C": { lat: 45.7000, lng: -73.6667, city: "Repentigny" },
  "J7E": { lat: 45.7333, lng: -73.5833, city: "L'Assomption" },
  "J7G": { lat: 45.6000, lng: -73.5500, city: "Le Gardeur" },
  "J7H": { lat: 45.6500, lng: -73.5167, city: "Charlemagne" },
  "J7J": { lat: 45.7000, lng: -73.6000, city: "L'Épiphanie" },
  "J7K": { lat: 45.7500, lng: -73.7333, city: "Rawdon" },
  "J7L": { lat: 45.8333, lng: -74.0500, city: "Ste-Sophie" },
  "J7M": { lat: 45.6667, lng: -73.7833, city: "Mascouche" },
  "J7N": { lat: 45.8667, lng: -74.0167, city: "Prévost" },
  "J7P": { lat: 45.8833, lng: -74.1000, city: "St-Sauveur" },
  "J7R": { lat: 46.0000, lng: -74.2000, city: "Ste-Adèle" },
  "J7T": { lat: 46.0833, lng: -74.4000, city: "Ste-Agathe" },
  "J7V": { lat: 45.6000, lng: -73.8000, city: "Terrebonne" },
  "J7X": { lat: 45.6167, lng: -73.8333, city: "Lachenaie" },
  "J7Y": { lat: 45.5833, lng: -73.8167, city: "Terrebonne" },
  "J7Z": { lat: 45.8000, lng: -74.0333, city: "St-Jérôme" },
  
  // Gatineau/Outaouais (J8/J9)
  "J8L": { lat: 45.7000, lng: -75.0333, city: "Buckingham" },
  "J8M": { lat: 45.7500, lng: -75.0833, city: "Masson-Angers" },
  "J8N": { lat: 45.5167, lng: -75.5333, city: "Gatineau" },
  "J8P": { lat: 45.4833, lng: -75.6500, city: "Gatineau" },
  "J8R": { lat: 45.4750, lng: -75.6750, city: "Gatineau" },
  "J8T": { lat: 45.4667, lng: -75.7000, city: "Gatineau" },
  "J8V": { lat: 45.4583, lng: -75.7250, city: "Gatineau" },
  "J8X": { lat: 45.4500, lng: -75.7333, city: "Gatineau" },
  "J8Y": { lat: 45.4417, lng: -75.7167, city: "Gatineau" },
  "J8Z": { lat: 45.4333, lng: -75.7500, city: "Gatineau" },
  "J9A": { lat: 45.4250, lng: -75.7667, city: "Gatineau" },
  "J9B": { lat: 45.5000, lng: -75.7500, city: "Gatineau" },
  "J9H": { lat: 45.4750, lng: -75.8000, city: "Aylmer" },
  "J9J": { lat: 45.4833, lng: -75.8333, city: "Aylmer" },
  
  // Sherbrooke / Eastern Townships (J1/J2)
  "J1C": { lat: 45.3333, lng: -71.9500, city: "Rock Forest" },
  "J1E": { lat: 45.4000, lng: -71.8833, city: "Sherbrooke" },
  "J1G": { lat: 45.3917, lng: -71.8500, city: "Sherbrooke" },
  "J1H": { lat: 45.4000, lng: -71.9000, city: "Sherbrooke" },
  "J1J": { lat: 45.4083, lng: -71.8667, city: "Sherbrooke" },
  "J1K": { lat: 45.4167, lng: -71.8500, city: "Sherbrooke" },
  "J1L": { lat: 45.3917, lng: -71.9167, city: "Sherbrooke" },
  "J1M": { lat: 45.3833, lng: -71.9500, city: "Sherbrooke" },
  "J1N": { lat: 45.3750, lng: -71.9000, city: "Sherbrooke" },
  "J1R": { lat: 45.3500, lng: -71.8333, city: "Sherbrooke" },
  "J1S": { lat: 45.3667, lng: -71.8000, city: "Ascot" },
  "J1T": { lat: 45.4333, lng: -71.7833, city: "Lennoxville" },
  "J1X": { lat: 45.4667, lng: -71.8167, city: "Bromptonville" },
  "J2A": { lat: 45.2833, lng: -72.8500, city: "Granby" },
  "J2B": { lat: 45.4000, lng: -72.7333, city: "Granby" },
  "J2C": { lat: 45.4167, lng: -72.6833, city: "Granby" },
  "J2E": { lat: 45.3500, lng: -72.7000, city: "Granby" },
  "J2G": { lat: 45.4333, lng: -72.7500, city: "Granby" },
  "J2H": { lat: 45.4000, lng: -72.7500, city: "Granby" },
  "J2J": { lat: 45.5500, lng: -72.5167, city: "Drummondville" },
  "J2K": { lat: 45.8833, lng: -72.4833, city: "Drummondville" },
  "J2L": { lat: 45.3333, lng: -72.2167, city: "Magog" },
  "J2N": { lat: 45.3833, lng: -72.1333, city: "Magog" },
  "J2S": { lat: 45.2833, lng: -72.9000, city: "Cowansville" },
  "J2T": { lat: 45.2167, lng: -72.7333, city: "Farnham" },
  "J2W": { lat: 45.1333, lng: -72.9833, city: "Bedford" },
  "J2X": { lat: 45.0333, lng: -73.0500, city: "Frelighsburg" },
  
  // Ontario (K)
  "K1A": { lat: 45.4215, lng: -75.6972, city: "Ottawa" },
  "K1B": { lat: 45.4333, lng: -75.6333, city: "Ottawa" },
  "K1C": { lat: 45.4500, lng: -75.6000, city: "Ottawa" },
  "K1E": { lat: 45.4667, lng: -75.5333, city: "Ottawa" },
  "K1G": { lat: 45.4167, lng: -75.6167, city: "Ottawa" },
  "K1H": { lat: 45.4000, lng: -75.6500, city: "Ottawa" },
  "K1J": { lat: 45.4333, lng: -75.6000, city: "Ottawa" },
  "K1K": { lat: 45.4500, lng: -75.6333, city: "Ottawa" },
  "K1L": { lat: 45.4333, lng: -75.6667, city: "Ottawa" },
  "K1M": { lat: 45.4500, lng: -75.6833, city: "Ottawa" },
  "K1N": { lat: 45.4333, lng: -75.6833, city: "Ottawa" },
  "K1P": { lat: 45.4215, lng: -75.6972, city: "Ottawa" },
  "K1R": { lat: 45.4000, lng: -75.7167, city: "Ottawa" },
  "K1S": { lat: 45.3833, lng: -75.7000, city: "Ottawa" },
  "K1T": { lat: 45.3667, lng: -75.6500, city: "Ottawa" },
  "K1V": { lat: 45.3500, lng: -75.6833, city: "Ottawa" },
  "K1W": { lat: 45.4000, lng: -75.5667, city: "Ottawa" },
  "K1X": { lat: 45.3500, lng: -75.6167, city: "Ottawa" },
  "K1Y": { lat: 45.4000, lng: -75.7333, city: "Ottawa" },
  "K1Z": { lat: 45.4000, lng: -75.7500, city: "Ottawa" },
  "K2A": { lat: 45.3667, lng: -75.7667, city: "Ottawa" },
  "K2B": { lat: 45.3500, lng: -75.8000, city: "Ottawa" },
  "K2C": { lat: 45.3500, lng: -75.7500, city: "Ottawa" },
  "K2E": { lat: 45.3333, lng: -75.7000, city: "Ottawa" },
  "K2G": { lat: 45.3333, lng: -75.7667, city: "Ottawa" },
  "K2H": { lat: 45.3167, lng: -75.8000, city: "Ottawa" },
  "K2J": { lat: 45.2833, lng: -75.7500, city: "Ottawa" },
  "K2K": { lat: 45.3500, lng: -75.9167, city: "Kanata" },
  "K2L": { lat: 45.3333, lng: -75.9000, city: "Kanata" },
  "K2M": { lat: 45.3000, lng: -75.9167, city: "Kanata" },
  "K2P": { lat: 45.4167, lng: -75.6833, city: "Ottawa" },
  "K2R": { lat: 45.2833, lng: -75.8333, city: "Ottawa" },
  "K2S": { lat: 45.3167, lng: -75.9167, city: "Stittsville" },
  "K2T": { lat: 45.3333, lng: -75.8667, city: "Kanata" },
  "K2V": { lat: 45.3167, lng: -75.8833, city: "Kanata" },
  "K2W": { lat: 45.3500, lng: -75.8500, city: "Kanata" },
};

// Fallback: First letter regional estimates
const REGIONAL_FALLBACKS: Record<string, { lat: number; lng: number }> = {
  "G": { lat: 46.8139, lng: -71.2082 },  // Quebec City region
  "H": { lat: 45.5017, lng: -73.5673 },  // Montreal region
  "J": { lat: 45.5500, lng: -73.6500 },  // Montreal suburbs / Various QC
  "K": { lat: 45.4215, lng: -75.6972 },  // Ottawa region
  "L": { lat: 43.8500, lng: -79.4000 },  // GTA North
  "M": { lat: 43.6532, lng: -79.3832 },  // Toronto
  "N": { lat: 43.2500, lng: -79.8500 },  // Southern Ontario
  "P": { lat: 46.5000, lng: -81.0000 },  // Northern Ontario
};

/**
 * Estimate lat/lng from postal code using ZipCode column
 */
function estimateLocation(postalCode: string | null): { lat: number; lng: number } | null {
  if (!postalCode) return null;
  
  // Clean postal code: remove spaces, uppercase
  const cleaned = postalCode.replace(/\s/g, "").toUpperCase();
  if (cleaned.length < 3) return null;
  
  // Try exact 3-character match first (most accurate)
  const prefix3 = cleaned.substring(0, 3);
  if (POSTAL_CENTROIDS[prefix3]) {
    // Add small random offset to prevent exact overlap of customers in same postal area
    const offset = () => (Math.random() - 0.5) * 0.006; // ~300m variance
    return {
      lat: POSTAL_CENTROIDS[prefix3].lat + offset(),
      lng: POSTAL_CENTROIDS[prefix3].lng + offset(),
    };
  }
  
  // Fall back to first letter regional estimate
  const firstLetter = cleaned.charAt(0);
  if (REGIONAL_FALLBACKS[firstLetter]) {
    // Larger offset for less precise fallback
    const offset = () => (Math.random() - 0.5) * 0.08; // ~4km variance
    return {
      lat: REGIONAL_FALLBACKS[firstLetter].lat + offset(),
      lng: REGIONAL_FALLBACKS[firstLetter].lng + offset(),
    };
  }
  
  return null;
}

export async function GET(req: Request) {
  // 1) Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const userEmail = user.email;
  const sessionRole = (user.role || "").toLowerCase().trim();

  // 2) Check authorization
  let isAuthorized = ALLOWED_USER_ROLES.includes(sessionRole);
  if (!isAuthorized && userEmail && BYPASS_EMAILS.includes(userEmail.toLowerCase())) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Vous ne disposez pas des autorisations nécessaires." },
      { status: 403 }
    );
  }

  // 3) Parse query params
  const { searchParams } = new URL(req.url);
  const gcieid = Number(searchParams.get("gcieid") ?? 2);
  const salesRep = searchParams.get("salesRep") || null;
  const product = searchParams.get("product") || null;
  const minSales = Number(searchParams.get("minSales") ?? 0);
  
  const endDate = searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);
  const startDate = searchParams.get("startDate") ?? 
    new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10);

  // 4) Validate dates
  if (
    Number.isNaN(new Date(startDate).getTime()) ||
    Number.isNaN(new Date(endDate).getTime())
  ) {
    return NextResponse.json(
      { error: "Format de date invalide fourni." },
      { status: 400 }
    );
  }

  // 5) Build SQL query using ZipCode column
  let paramIndex = 4;
  const conditions: string[] = [];
  const params: (string | number)[] = [gcieid, startDate, endDate];

  if (salesRep) {
    conditions.push(`sr."Name" = $${paramIndex}`);
    params.push(salesRep);
    paramIndex++;
  }

  if (product) {
    conditions.push(`i."ItemCode" = $${paramIndex}`);
    params.push(product);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  const SQL_QUERY = `
    SELECT
      c."CustId" AS "customerId",
      c."Name" AS "customerName",
      c."Addr1" AS "address",
      c."City" AS "city",
      c."Prov" AS "province",
      c."ZipCode" AS "postalCode",
      c."Phone" AS "phone",
      sr."Name" AS "salesRepName",
      SUM(d."Amount"::float8) AS "totalSales",
      COUNT(DISTINCT h."invnbr") AS "transactionCount",
      MIN(h."InvDate") AS "firstInvoice",
      MAX(h."InvDate") AS "lastInvoice",
      STRING_AGG(DISTINCT i."ItemCode", ', ' ORDER BY i."ItemCode") AS "productsPurchased"
    FROM public."InvHeader" h
    JOIN public."Salesrep" sr ON h."srid" = sr."SRId"
    JOIN public."Customers" c ON h."custid" = c."CustId"
    JOIN public."InvDetail" d ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
    JOIN public."Items" i ON d."Itemid" = i."ItemId"
    JOIN public."Products" p ON i."ProdId" = p."ProdId" AND p."CieID" = h."cieid"
    WHERE h."cieid" = $1
      AND h."InvDate" BETWEEN $2 AND $3
      AND sr."Name" <> 'OTOPROTEC (004)'
      AND c."ZipCode" IS NOT NULL
      AND c."ZipCode" <> ''
      ${whereClause}
    GROUP BY 
      c."CustId", c."Name", c."Addr1", c."City", c."Prov", c."ZipCode",
      c."Phone", sr."Name"
    HAVING SUM(d."Amount"::float8) >= ${minSales}
    ORDER BY SUM(d."Amount"::float8) DESC;
  `;

  try {
    const { rows } = await pg.query(SQL_QUERY, params);
    
    // Transform data with estimated locations from postal codes
    const customers = rows
      .map((row: any) => {
        const location = estimateLocation(row.postalCode);
        if (!location) return null; // Skip customers without valid postal codes
        
        const totalSales = parseFloat(row.totalSales);
        
        return {
          customerId: row.customerId,
          customerName: row.customerName,
          address: row.address,
          city: row.city,
          province: row.province,
          postalCode: row.postalCode,
          phone: row.phone,
          salesRepName: row.salesRepName,
          totalSales,
          transactionCount: parseInt(row.transactionCount, 10),
          firstInvoice: row.firstInvoice,
          lastInvoice: row.lastInvoice,
          productsPurchased: row.productsPurchased,
          lat: location.lat,
          lng: location.lng,
          pinColor: getPinColor(totalSales),
          pinSize: getPinSize(totalSales),
        };
      })
      .filter(Boolean); // Remove null entries

    return NextResponse.json({
      customers,
      total: customers.length,
      filters: {
        salesRep,
        product,
        minSales,
        startDate,
        endDate,
      },
    });
  } catch (error: any) {
    console.error("Database query failed in /api/customers/map:", error);
    return NextResponse.json(
      {
        error: "Échec de la récupération des données.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Color based on sales volume
function getPinColor(totalSales: number): string {
  if (totalSales >= 10000) return "green";
  if (totalSales >= 5000) return "blue";
  if (totalSales >= 2000) return "yellow";
  if (totalSales >= 500) return "orange";
  return "red";
}

// Size based on sales volume
function getPinSize(totalSales: number): string {
  if (totalSales >= 10000) return "xl";
  if (totalSales >= 5000) return "lg";
  if (totalSales >= 2000) return "md";
  return "sm";
}
