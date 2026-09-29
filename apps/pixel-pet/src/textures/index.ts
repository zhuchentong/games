/** 纹理总入口：BootScene 调用一次，全部美术启动时烘焙，无外部素材。 */

import type Phaser from "phaser";
import { bakeItems } from "./items";
import { bakePets } from "./pets";
import { bakeBall, bakePlant, bakeRoom, bakeWeather, bakeWindow } from "./room";
import { bakeUi } from "./ui";

export const TEX = {
  room: "room",
  windowDay: "window-day",
  windowNight: "window-night",
  ball: "ball",
  plant: "plant",
  plantBloom: "plant-bloom",
  btn: "btn",
  dialog: "dialog",
  speech: "speech",
  rice: "rice",
  pudding: "pudding",
  medicine: "medicine",
  poop0: "poop-0",
  poop1: "poop-1",
  bubble: "bubble",
  heart: "heart",
  heartS: "heart-s",
  heartS0: "heart-s-0",
  zzz: "zzz",
  sweat: "sweat",
  anger: "anger",
  note: "note",
  sparkle: "sparkle",
  crack0: "crack-0",
  crack1: "crack-1",
  tagCat: "tag-cat",
  tagDog: "tag-dog",
  tagRabbit: "tag-rabbit",
  tagChick: "tag-chick",
  icHunger: "ic-hunger",
  icEnergy: "ic-energy",
  icClean: "ic-clean",
  coin: "coin",
  decorArt: "decor-art",
  decorBed: "decor-bed",
  gift: "gift",
  butterfly: "butterfly",
  weatherRain: "weather-rain",
  weatherSnow: "weather-snow",
} as const;

export function eggTexKey(speciesId: string, variant: number): string {
  return `egg-${speciesId}-${variant}`;
}

export const TAG_ICON: Record<string, string> = {
  cat: TEX.tagCat,
  dog: TEX.tagDog,
  rabbit: TEX.tagRabbit,
  chick: TEX.tagChick,
};

export function createTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  bakeRoom(g);
  bakeWindow(g);
  bakeWeather(g);
  bakeBall(g);
  bakePlant(g);
  bakeUi(g);
  bakeItems(g);
  bakePets(g);
  g.destroy();
}
