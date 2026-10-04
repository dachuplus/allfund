<template>
  <div class="games-panel">
    <div class="games-subtabs">
      <div
        v-for="g in GAMES"
        :key="g.key"
        class="games-subtab"
        :class="{ active: activeGame === g.key }"
        @click="activeGame = g.key"
      >{{ g.label }}</div>
    </div>

    <div class="games-area">
      <MinesweeperGame v-if="activeGame === 'minesweeper'" />
      <Game2048 v-else-if="activeGame === '2048'" />
      <MiniMinecraft v-else-if="activeGame === 'minecraft'" />
      <PlatformMario v-else-if="activeGame === 'mario'" />
      <SokobanGame v-else-if="activeGame === 'sokoban'" />
      <LinkEliminate v-else-if="activeGame === 'link'" />
      <HexEliminate v-else />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MinesweeperGame from './MinesweeperGame.vue'
import Game2048 from './Game2048.vue'
import MiniMinecraft from './MiniMinecraft.vue'
import PlatformMario from './PlatformMario.vue'
import SokobanGame from './SokobanGame.vue'
import LinkEliminate from './LinkEliminate.vue'
import HexEliminate from './HexEliminate.vue'

const GAMES = [
  { key: 'minesweeper', label: '扫雷' },
  { key: '2048', label: '2048' },
  { key: 'minecraft', label: '方块世界' },
  { key: 'mario', label: '平台冒险' },
  { key: 'sokoban', label: '推箱子' },
  { key: 'link', label: '连线消除' },
  { key: 'hex', label: '六角消除' },
]

const activeGame = ref('minesweeper')
</script>

<style scoped>
.games-panel { padding: 4px 0; }
.games-subtabs {
  display: flex;
  gap: 0;
  border: 1px solid #b1b4b6;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.games-subtab {
  flex: 1 1 auto;
  min-width: 72px;
  text-align: center;
  padding: 10px 8px;
  cursor: pointer;
  font-size: 15px;
  color: #1d70b8;
  background: #fff;
  border-right: 1px solid #b1b4b6;
  user-select: none;
  white-space: nowrap;
}
.games-subtab:last-child { border-right: none; }
.games-subtab.active { background: #1d70b8; color: #fff; font-weight: 700; }
.games-area {
  display: flex;
  justify-content: center;
}
</style>
