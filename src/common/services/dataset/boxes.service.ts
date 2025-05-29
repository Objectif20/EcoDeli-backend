import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

@Injectable()
export class BoxService {
  private boxes: { id: string; name: string; lat: number; lon: number }[] = [];

  constructor() {
    this.loadBoxes();
  }

  private loadBoxes() {
    const csvFilePath = path.join(__dirname, '..', '..', '..','..', 'assets', 'dataset', 'boxes.csv');
    const content = fs.readFileSync(csvFilePath, 'utf8');
    const records = parse(content, {
      delimiter: ';',
      columns: true,
      skip_empty_lines: true,
    });

    this.boxes = records.map((row: any) => ({
      id: row.id,
      name: row.nom,
      lat: parseFloat(row.latitude),
      lon: parseFloat(row.longitude),
    }));
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  findNearestBox(lat: number, lon: number) {
    let closest: { id: string; name: string; lat: number; lon: number } | null = null;
    let minDistance = Infinity;

    for (const box of this.boxes) {
      const dist = this.haversineDistance(lat, lon, box.lat, box.lon);
      if (dist < minDistance) {
        minDistance = dist;
        closest = box;
      }
    }

    return closest;
  }
}
