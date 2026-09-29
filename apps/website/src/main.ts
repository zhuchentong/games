import "./style.css";

interface Game {
  id: string;
  title: string;
  tagline: string;
  href: string;
  accent: string;
}

const GAMES: Game[] = [
  {
    id: "animal-quest",
    title: "动物斗恶龙",
    tagline: "动物英雄闯关斗龙,多阶段 Boss、商店与技能build。",
    href: import.meta.env.DEV ? "http://127.0.0.1:5174/" : "./animal-quest/",
    accent: "#8b7cf8",
  },
  {
    id: "tower-100",
    title: "是男人就上100层",
    tagline: "经典垂直登塔跳台,手速与胆量的双重考验。",
    href: import.meta.env.DEV ? "http://127.0.0.1:5175/" : "./tower-100/",
    accent: "#ff9457",
  },
  {
    id: "pixel-pet",
    title: "像素电子宠物",
    tagline: "随机四选一孵化猫狗兔鸡,喂食玩耍清洁睡觉,分支进化全看照顾。",
    href: import.meta.env.DEV ? "http://127.0.0.1:5176/" : "./pixel-pet/",
    accent: "#ffd32a",
  },
];

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="hub">
    <header class="hub-header">
      <h1>游戏合集</h1>
      <p>挑一款,直接开玩。</p>
    </header>
    <section class="grid">
      ${GAMES.map(
        (g) => `
        <a class="card" href="${g.href}" style="--accent: ${g.accent}">
          <span class="card-tag">${g.id}</span>
          <h2 class="card-title">${g.title}</h2>
          <p class="card-desc">${g.tagline}</p>
          <span class="card-cta">开始游戏 →</span>
        </a>`,
      ).join("")}
    </section>
    <footer class="hub-footer">更多游戏制作中……</footer>
  </main>
`;
