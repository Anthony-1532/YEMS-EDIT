#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const emojiMap = {
  '📋': '<span class="icon">' + Icons.fileText + '</span>',
  '📄': '<span class="icon">' + Icons.fileText + '</span>',
  '✅': '<span class="icon">' + Icons.checkCircle + '</span>',
  '✕': '<span class="icon">' + Icons.x + '</span>',
  '🎉': '<span class="icon">' + Icons.star + '</span>',
  '👑': '<span class="icon">' + Icons.award + '</span>',
  '👤': '<span class="icon">' + Icons.user + '</span>',
  '👥': '<span class="icon">' + Icons.users + '</span>',
  '📚': '<span class="icon">' + Icons.book + '</span>',
  '🎓': '<span class="icon">' + Icons.graduationCap + '</span>',
  '🏫': '<span class="icon">' + Icons.school + '</span>',
  '📜': '<span class="icon">' + Icons.fileText + '</span>',
  '🔔': '<span class="icon">' + Icons.bell + '</span>',
  '📝': '<span class="icon">' + Icons.edit + '</span>',
  '📖': '<span class="icon">' + Icons.bookOpen + '</span>',
  '📑': '<span class="icon">' + Icons.bookmark + '</span>',
  '📊': '<span class="icon">' + Icons.chart + '</span>',
  '📧': '<span class="icon">' + Icons.mail + '</span>',
  '🔒': '<span class="icon">' + Icons.lock + '</span>',
  '👋': '<span class="icon">' + Icons.hand + '</span>',
  '✓': '<span class="icon">' + Icons.check + '</span>',
  '⚠': '<span class="icon">' + Icons.alertCircle + '</span>',
  '⚠️': '<span class="icon">' + Icons.alertCircle + '</span>',
  'ℹ': '<span class="icon">' + Icons.info + '</span>',
  'ℹ️': '<span class="icon">' + Icons.info + '</span>',
  '✏': '<span class="icon">' + Icons.edit + '</span>',
  '✏️': '<span class="icon">' + Icons.edit + '</span>',
  '👁': '<span class="icon">' + Icons.eye + '</span>',
  '👁️': '<span class="icon">' + Icons.eye + '</span>',
  '💾': '<span class="icon">' + Icons.save + '</span>',
  '💓': '<span class="icon">' + Icons.heart + '</span>',
  '🔐': '<span class="icon">' + Icons.lock + '</span>',
  '🔧': '<span class="icon">' + Icons.wrench + '</span>',
  '✨': '<span class="icon">' + Icons.star + '</span>',
  '⏳': '<span class="icon">' + Icons.clock + '</span>',
  '🎓': '<span class="icon">' + Icons.graduationCap + '</span>',
  '🧠': '<span class="icon">' + Icons.cpu + '</span>',
  '✍': '<span class="icon">' + Icons.edit + '</span>',
  '✍️': '<span class="icon">' + Icons.edit + '</span>',
  '⚛': '<span class="icon">' + Icons.activity + '</span>',
  '⚛️': '<span class="icon">' + Icons.activity + '</span>',
  '📖': '<span class="icon">' + Icons.bookOpen + '</span>',
  '🧬': '<span class="icon">' + Icons.dna + '</span>',
  '🌍': '<span class="icon">' + Icons.globe + '</span>',
  '📐': '<span class="icon">' + Icons.penTool + '</span>',
  '💻': '<span class="icon">' + Icons.laptop + '</span>',
  '🧪': '<span class="icon">' + Icons.flaskConical + '</span>',
  '🏛': '<span class="icon">' + Icons.building + '</span>',
  '🏛️': '<span class="icon">' + Icons.building + '</span>',
};

const jsDir = './js';
const files = readdirSync(jsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  let content = readFileSync(join(jsDir, file), 'utf8');
  let modified = false;
  
  for (const [emoji, replacement] of Object.entries(emojiMap)) {
    if (content.includes(emoji)) {
      content = content.split(emoji).join(replacement);
      modified = true;
    }
  }
  
  if (modified) {
    writeFileSync(join(jsDir, file), content);
    console.log(`Updated ${file}`);
  }
});

console.log('Done!');