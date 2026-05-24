'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmojiCategory {
  id: string
  label: string
  icon: string
  emojis: Array<{ emoji: string; keywords: string[] }>
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Sorrisos e pessoas',
    icon: '😀',
    emojis: [
      { emoji: '😀', keywords: ['feliz', 'sorriso', 'happy'] },
      { emoji: '😃', keywords: ['feliz', 'sorriso', 'happy'] },
      { emoji: '😄', keywords: ['feliz', 'sorriso', 'happy'] },
      { emoji: '😁', keywords: ['feliz', 'sorriso', 'grin'] },
      { emoji: '😆', keywords: ['riso', 'risada', 'laugh'] },
      { emoji: '😅', keywords: ['suor', 'nervoso', 'sweat'] },
      { emoji: '🤣', keywords: ['riso', 'risada', 'chorar de rir'] },
      { emoji: '😂', keywords: ['riso', 'chorar de rir', 'tears'] },
      { emoji: '🙂', keywords: ['sorriso', 'leve', 'slight'] },
      { emoji: '🙃', keywords: ['invertido', 'upside down'] },
      { emoji: '😉', keywords: ['piscada', 'wink'] },
      { emoji: '😊', keywords: ['feliz', 'corado', 'blush'] },
      { emoji: '😇', keywords: ['anjo', 'inocente', 'angel'] },
      { emoji: '🥰', keywords: ['amor', 'coracoes', 'love'] },
      { emoji: '😍', keywords: ['amor', 'olhos de coracao', 'love'] },
      { emoji: '🤩', keywords: ['estrelas', 'empolgado', 'star'] },
      { emoji: '😘', keywords: ['beijo', 'kiss'] },
      { emoji: '😗', keywords: ['beijo', 'kiss'] },
      { emoji: '☺️', keywords: ['sorriso', 'feliz'] },
      { emoji: '😚', keywords: ['beijo', 'olhos fechados'] },
      { emoji: '😋', keywords: ['delicia', 'yummy'] },
      { emoji: '😛', keywords: ['lingua', 'tongue'] },
      { emoji: '😜', keywords: ['lingua', 'piscada', 'wink'] },
      { emoji: '🤪', keywords: ['maluco', 'louco', 'crazy'] },
      { emoji: '😝', keywords: ['lingua', 'olhos fechados'] },
      { emoji: '🤑', keywords: ['dinheiro', 'money'] },
      { emoji: '🤗', keywords: ['abraco', 'hug'] },
      { emoji: '🤭', keywords: ['ops', 'risada', 'oops'] },
      { emoji: '🫢', keywords: ['surpresa', 'boca aberta'] },
      { emoji: '🫣', keywords: ['espiando', 'peek'] },
      { emoji: '🤫', keywords: ['silencio', 'shh'] },
      { emoji: '🤔', keywords: ['pensando', 'thinking'] },
      { emoji: '🫡', keywords: ['saudacao', 'salute'] },
      { emoji: '🤐', keywords: ['boca fechada', 'zip'] },
      { emoji: '🤨', keywords: ['desconfiado', 'raised brow'] },
      { emoji: '😐', keywords: ['neutro', 'neutral'] },
      { emoji: '😑', keywords: ['sem expressao', 'expressionless'] },
      { emoji: '😶', keywords: ['sem boca', 'no mouth'] },
      { emoji: '🫥', keywords: ['invisivel', 'dotted'] },
      { emoji: '😏', keywords: ['malicia', 'smirk'] },
      { emoji: '😒', keywords: ['descontente', 'unamused'] },
      { emoji: '🙄', keywords: ['revirando', 'eye roll'] },
      { emoji: '😬', keywords: ['grimace', 'nervoso'] },
      { emoji: '😮‍💨', keywords: ['suspiro', 'exhale'] },
      { emoji: '🤥', keywords: ['mentira', 'lie'] },
      { emoji: '🫠', keywords: ['derretendo', 'melting'] },
      { emoji: '😌', keywords: ['aliviado', 'relieved'] },
      { emoji: '😔', keywords: ['triste', 'pensive'] },
      { emoji: '😪', keywords: ['sono', 'sleepy'] },
      { emoji: '🤤', keywords: ['babando', 'drool'] },
      { emoji: '😴', keywords: ['dormindo', 'sleep'] },
      { emoji: '😷', keywords: ['mascara', 'doente', 'mask'] },
      { emoji: '🤒', keywords: ['doente', 'febre', 'sick'] },
      { emoji: '🤕', keywords: ['machucado', 'hurt'] },
      { emoji: '🤢', keywords: ['enjoo', 'nausea'] },
      { emoji: '🤮', keywords: ['vomito', 'vomit'] },
      { emoji: '🥵', keywords: ['calor', 'hot'] },
      { emoji: '🥶', keywords: ['frio', 'cold'] },
      { emoji: '🥴', keywords: ['tonto', 'woozy'] },
      { emoji: '😵', keywords: ['tonto', 'dizzy'] },
      { emoji: '🤯', keywords: ['mente explodindo', 'mind blown'] },
      { emoji: '🤠', keywords: ['cowboy', 'chapeu'] },
      { emoji: '🥳', keywords: ['festa', 'party'] },
      { emoji: '🥸', keywords: ['disfarce', 'disguise'] },
      { emoji: '😎', keywords: ['oculos', 'cool'] },
      { emoji: '🤓', keywords: ['nerd', 'oculos'] },
      { emoji: '🧐', keywords: ['monoculo', 'investigando'] },
      { emoji: '😕', keywords: ['confuso', 'confused'] },
      { emoji: '🫤', keywords: ['boca torta', 'diagonal'] },
      { emoji: '😟', keywords: ['preocupado', 'worried'] },
      { emoji: '🙁', keywords: ['triste', 'frown'] },
      { emoji: '☹️', keywords: ['triste', 'frown'] },
      { emoji: '😮', keywords: ['surpreso', 'surprised'] },
      { emoji: '😯', keywords: ['surpreso', 'hushed'] },
      { emoji: '😲', keywords: ['chocado', 'astonished'] },
      { emoji: '😳', keywords: ['vermelho', 'flushed'] },
      { emoji: '🥺', keywords: ['pedindo', 'please'] },
      { emoji: '🥹', keywords: ['emocionado', 'holding tears'] },
      { emoji: '😦', keywords: ['preocupado', 'frown'] },
      { emoji: '😧', keywords: ['angustiado', 'anguished'] },
      { emoji: '😨', keywords: ['medo', 'fearful'] },
      { emoji: '😰', keywords: ['ansioso', 'anxious'] },
      { emoji: '😥', keywords: ['triste', 'disappointed'] },
      { emoji: '😢', keywords: ['triste', 'chorando', 'cry'] },
      { emoji: '😭', keywords: ['chorando', 'cry', 'loud'] },
      { emoji: '😱', keywords: ['medo', 'grito', 'scream'] },
      { emoji: '😖', keywords: ['confuso', 'confounded'] },
      { emoji: '😣', keywords: ['perseverando', 'persevere'] },
      { emoji: '😞', keywords: ['desapontado', 'disappointed'] },
      { emoji: '😓', keywords: ['suor frio', 'downcast'] },
      { emoji: '😩', keywords: ['exausto', 'weary'] },
      { emoji: '😫', keywords: ['cansado', 'tired'] },
      { emoji: '🥱', keywords: ['bocejo', 'yawn'] },
      { emoji: '😤', keywords: ['raiva', 'angry'] },
      { emoji: '😠', keywords: ['raiva', 'angry'] },
      { emoji: '😡', keywords: ['furioso', 'rage'] },
      { emoji: '🤬', keywords: ['xingando', 'cursing'] },
      { emoji: '😈', keywords: ['diabo', 'devil'] },
      { emoji: '👿', keywords: ['diabo', 'angry devil'] },
      { emoji: '💀', keywords: ['caveira', 'skull'] },
      { emoji: '☠️', keywords: ['caveira', 'skull crossbones'] },
      { emoji: '💩', keywords: ['coco', 'poop'] },
      { emoji: '🤡', keywords: ['palhaco', 'clown'] },
      { emoji: '👹', keywords: ['ogro', 'ogre'] },
      { emoji: '👻', keywords: ['fantasma', 'ghost'] },
      { emoji: '👽', keywords: ['alien', 'extraterrestre'] },
      { emoji: '🤖', keywords: ['robo', 'robot'] },
      { emoji: '😺', keywords: ['gato', 'feliz', 'cat'] },
      { emoji: '😸', keywords: ['gato', 'sorriso', 'cat'] },
      { emoji: '😹', keywords: ['gato', 'riso', 'cat'] },
      { emoji: '😻', keywords: ['gato', 'amor', 'cat'] },
      { emoji: '🙈', keywords: ['macaco', 'nao ver'] },
      { emoji: '🙉', keywords: ['macaco', 'nao ouvir'] },
      { emoji: '🙊', keywords: ['macaco', 'nao falar'] },
    ],
  },
  {
    id: 'gestures',
    label: 'Gestos e corpo',
    icon: '👋',
    emojis: [
      { emoji: '👋', keywords: ['oi', 'tchau', 'wave'] },
      { emoji: '🤚', keywords: ['mao', 'raised'] },
      { emoji: '🖐️', keywords: ['mao', 'hand'] },
      { emoji: '✋', keywords: ['pare', 'stop'] },
      { emoji: '🖖', keywords: ['spock', 'vulcano'] },
      { emoji: '🫱', keywords: ['mao direita'] },
      { emoji: '🫲', keywords: ['mao esquerda'] },
      { emoji: '🫳', keywords: ['mao para baixo'] },
      { emoji: '🫴', keywords: ['mao para cima'] },
      { emoji: '🫷', keywords: ['empurrando esquerda'] },
      { emoji: '🫸', keywords: ['empurrando direita'] },
      { emoji: '👌', keywords: ['ok', 'perfeito'] },
      { emoji: '🤌', keywords: ['italiano', 'pinched'] },
      { emoji: '🤏', keywords: ['pouco', 'pinch'] },
      { emoji: '✌️', keywords: ['paz', 'vitoria', 'peace'] },
      { emoji: '🤞', keywords: ['sorte', 'fingers crossed'] },
      { emoji: '🫰', keywords: ['dinheiro', 'snap'] },
      { emoji: '🤟', keywords: ['te amo', 'love'] },
      { emoji: '🤘', keywords: ['rock', 'metal'] },
      { emoji: '🤙', keywords: ['telefone', 'call'] },
      { emoji: '👈', keywords: ['esquerda', 'left'] },
      { emoji: '👉', keywords: ['direita', 'right'] },
      { emoji: '👆', keywords: ['cima', 'up'] },
      { emoji: '🖕', keywords: ['dedo medio', 'middle finger'] },
      { emoji: '👇', keywords: ['baixo', 'down'] },
      { emoji: '☝️', keywords: ['cima', 'up', 'index'] },
      { emoji: '🫵', keywords: ['apontando', 'pointing'] },
      { emoji: '👍', keywords: ['positivo', 'like', 'ok'] },
      { emoji: '👎', keywords: ['negativo', 'dislike'] },
      { emoji: '✊', keywords: ['punho', 'fist'] },
      { emoji: '👊', keywords: ['soco', 'punch'] },
      { emoji: '🤛', keywords: ['punho esquerdo'] },
      { emoji: '🤜', keywords: ['punho direito'] },
      { emoji: '👏', keywords: ['palmas', 'clap'] },
      { emoji: '🙌', keywords: ['celebracao', 'celebration'] },
      { emoji: '🫶', keywords: ['coracao', 'mao', 'heart'] },
      { emoji: '👐', keywords: ['maos abertas', 'open'] },
      { emoji: '🤲', keywords: ['maos', 'palms'] },
      { emoji: '🤝', keywords: ['aperto de mao', 'handshake'] },
      { emoji: '🙏', keywords: ['obrigado', 'oracao', 'please'] },
      { emoji: '✍️', keywords: ['escrevendo', 'writing'] },
      { emoji: '💅', keywords: ['unha', 'nail'] },
      { emoji: '🤳', keywords: ['selfie'] },
      { emoji: '💪', keywords: ['forca', 'strong', 'muscle'] },
      { emoji: '🦾', keywords: ['braco mecanico', 'prosthetic'] },
      { emoji: '🦿', keywords: ['perna mecanica', 'prosthetic'] },
      { emoji: '🦵', keywords: ['perna', 'leg'] },
      { emoji: '🦶', keywords: ['pe', 'foot'] },
      { emoji: '👂', keywords: ['orelha', 'ear'] },
      { emoji: '👃', keywords: ['nariz', 'nose'] },
      { emoji: '🧠', keywords: ['cerebro', 'brain'] },
      { emoji: '🫀', keywords: ['coracao', 'heart organ'] },
      { emoji: '🫁', keywords: ['pulmao', 'lungs'] },
      { emoji: '👀', keywords: ['olhos', 'eyes', 'look'] },
      { emoji: '👁️', keywords: ['olho', 'eye'] },
      { emoji: '👅', keywords: ['lingua', 'tongue'] },
      { emoji: '👄', keywords: ['boca', 'lips'] },
    ],
  },
  {
    id: 'hearts',
    label: 'Corações e amor',
    icon: '❤️',
    emojis: [
      { emoji: '❤️', keywords: ['coracao', 'amor', 'heart', 'red'] },
      { emoji: '🧡', keywords: ['coracao', 'laranja', 'orange'] },
      { emoji: '💛', keywords: ['coracao', 'amarelo', 'yellow'] },
      { emoji: '💚', keywords: ['coracao', 'verde', 'green'] },
      { emoji: '💙', keywords: ['coracao', 'azul', 'blue'] },
      { emoji: '💜', keywords: ['coracao', 'roxo', 'purple'] },
      { emoji: '🖤', keywords: ['coracao', 'preto', 'black'] },
      { emoji: '🤍', keywords: ['coracao', 'branco', 'white'] },
      { emoji: '🤎', keywords: ['coracao', 'marrom', 'brown'] },
      { emoji: '🩷', keywords: ['coracao', 'rosa', 'pink'] },
      { emoji: '🩵', keywords: ['coracao', 'azul claro', 'light blue'] },
      { emoji: '🩶', keywords: ['coracao', 'cinza', 'grey'] },
      { emoji: '❤️‍🔥', keywords: ['coracao', 'fogo', 'fire heart'] },
      { emoji: '❤️‍🩹', keywords: ['coracao', 'curando', 'mending'] },
      { emoji: '💔', keywords: ['coracao', 'partido', 'broken'] },
      { emoji: '❣️', keywords: ['coracao', 'exclamacao'] },
      { emoji: '💕', keywords: ['coracoes', 'two hearts'] },
      { emoji: '💞', keywords: ['coracoes', 'revolving'] },
      { emoji: '💓', keywords: ['coracao', 'beating'] },
      { emoji: '💗', keywords: ['coracao', 'growing'] },
      { emoji: '💖', keywords: ['coracao', 'sparkling'] },
      { emoji: '💘', keywords: ['coracao', 'flecha', 'cupid'] },
      { emoji: '💝', keywords: ['coracao', 'fita', 'ribbon'] },
      { emoji: '💟', keywords: ['coracao', 'decoration'] },
      { emoji: '💋', keywords: ['beijo', 'kiss'] },
      { emoji: '💌', keywords: ['carta', 'amor', 'love letter'] },
      { emoji: '💍', keywords: ['anel', 'ring'] },
      { emoji: '💐', keywords: ['buque', 'flores', 'bouquet'] },
      { emoji: '🌹', keywords: ['rosa', 'rose'] },
      { emoji: '🥀', keywords: ['flor murcha', 'wilted'] },
      { emoji: '💒', keywords: ['casamento', 'wedding'] },
      { emoji: '👰', keywords: ['noiva', 'bride'] },
      { emoji: '🤵', keywords: ['noivo', 'groom'] },
      { emoji: '💑', keywords: ['casal', 'couple'] },
      { emoji: '👫', keywords: ['casal', 'couple'] },
      { emoji: '💏', keywords: ['beijo', 'kiss couple'] },
    ],
  },
  {
    id: 'objects',
    label: 'Objetos e símbolos',
    icon: '📦',
    emojis: [
      { emoji: '⭐', keywords: ['estrela', 'star'] },
      { emoji: '🌟', keywords: ['estrela', 'brilho', 'star'] },
      { emoji: '✨', keywords: ['brilho', 'sparkle'] },
      { emoji: '⚡', keywords: ['raio', 'lightning'] },
      { emoji: '💡', keywords: ['ideia', 'lampada', 'idea'] },
      { emoji: '🔥', keywords: ['fogo', 'fire', 'hot'] },
      { emoji: '💯', keywords: ['cem', 'perfeito', 'hundred'] },
      { emoji: '✅', keywords: ['check', 'ok', 'feito'] },
      { emoji: '❌', keywords: ['x', 'nao', 'errado'] },
      { emoji: '⚠️', keywords: ['aviso', 'warning'] },
      { emoji: '🚫', keywords: ['proibido', 'prohibited'] },
      { emoji: '❓', keywords: ['interrogacao', 'question'] },
      { emoji: '❗', keywords: ['exclamacao', 'exclamation'] },
      { emoji: '💬', keywords: ['balao', 'fala', 'speech'] },
      { emoji: '💭', keywords: ['pensamento', 'thought'] },
      { emoji: '📌', keywords: ['pin', 'fixar'] },
      { emoji: '📎', keywords: ['clipe', 'clip'] },
      { emoji: '📝', keywords: ['nota', 'escrever', 'memo'] },
      { emoji: '📅', keywords: ['calendario', 'data', 'calendar'] },
      { emoji: '📆', keywords: ['calendario', 'calendar'] },
      { emoji: '📊', keywords: ['grafico', 'chart'] },
      { emoji: '📈', keywords: ['grafico', 'subindo', 'trending up'] },
      { emoji: '📉', keywords: ['grafico', 'descendo', 'trending down'] },
      { emoji: '🎯', keywords: ['alvo', 'target'] },
      { emoji: '🏆', keywords: ['trofeu', 'trophy'] },
      { emoji: '🥇', keywords: ['medalha', 'ouro', 'gold'] },
      { emoji: '🥈', keywords: ['medalha', 'prata', 'silver'] },
      { emoji: '🥉', keywords: ['medalha', 'bronze'] },
      { emoji: '🏅', keywords: ['medalha', 'medal'] },
      { emoji: '🎉', keywords: ['festa', 'party'] },
      { emoji: '🎊', keywords: ['confete', 'confetti'] },
      { emoji: '🎈', keywords: ['balao', 'balloon'] },
      { emoji: '🎁', keywords: ['presente', 'gift'] },
      { emoji: '🎀', keywords: ['laco', 'ribbon'] },
      { emoji: '🔔', keywords: ['sino', 'bell', 'notificacao'] },
      { emoji: '🔕', keywords: ['sino', 'mudo', 'mute'] },
      { emoji: '🔑', keywords: ['chave', 'key'] },
      { emoji: '🔒', keywords: ['cadeado', 'lock'] },
      { emoji: '🔓', keywords: ['cadeado', 'aberto', 'unlock'] },
      { emoji: '💼', keywords: ['maleta', 'briefcase', 'trabalho'] },
      { emoji: '📱', keywords: ['celular', 'phone'] },
      { emoji: '💻', keywords: ['computador', 'laptop'] },
      { emoji: '🖥️', keywords: ['computador', 'desktop'] },
      { emoji: '⌨️', keywords: ['teclado', 'keyboard'] },
      { emoji: '🖨️', keywords: ['impressora', 'printer'] },
      { emoji: '📧', keywords: ['email', 'carta'] },
      { emoji: '📬', keywords: ['caixa correio', 'mailbox'] },
      { emoji: '📄', keywords: ['documento', 'document'] },
      { emoji: '📋', keywords: ['prancheta', 'clipboard'] },
      { emoji: '📁', keywords: ['pasta', 'folder'] },
      { emoji: '🗑️', keywords: ['lixeira', 'trash'] },
      { emoji: '🏥', keywords: ['hospital', 'saude', 'health'] },
      { emoji: '💊', keywords: ['remedio', 'medicine'] },
      { emoji: '🩺', keywords: ['estetoscopio', 'medico', 'doctor'] },
      { emoji: '💉', keywords: ['seringa', 'vacina', 'syringe'] },
      { emoji: '🩹', keywords: ['curativo', 'bandage'] },
      { emoji: '🔬', keywords: ['microscopio', 'microscope'] },
      { emoji: '🧪', keywords: ['tubo ensaio', 'test tube'] },
      { emoji: '🧬', keywords: ['dna', 'genetica'] },
      { emoji: '💰', keywords: ['dinheiro', 'money'] },
      { emoji: '💵', keywords: ['dolar', 'dollar'] },
      { emoji: '💳', keywords: ['cartao', 'card'] },
      { emoji: '🧾', keywords: ['recibo', 'receipt'] },
      { emoji: '⏰', keywords: ['relogio', 'alarm', 'clock'] },
      { emoji: '⏳', keywords: ['ampulheta', 'hourglass'] },
      { emoji: '📣', keywords: ['megafone', 'megaphone'] },
      { emoji: '📢', keywords: ['alto falante', 'loudspeaker'] },
      { emoji: '🔍', keywords: ['lupa', 'search'] },
      { emoji: '🔎', keywords: ['lupa', 'search'] },
    ],
  },
  {
    id: 'arrows',
    label: 'Setas e símbolos',
    icon: '➡️',
    emojis: [
      { emoji: '➡️', keywords: ['seta', 'direita', 'right'] },
      { emoji: '⬅️', keywords: ['seta', 'esquerda', 'left'] },
      { emoji: '⬆️', keywords: ['seta', 'cima', 'up'] },
      { emoji: '⬇️', keywords: ['seta', 'baixo', 'down'] },
      { emoji: '↗️', keywords: ['seta', 'diagonal'] },
      { emoji: '↘️', keywords: ['seta', 'diagonal'] },
      { emoji: '↙️', keywords: ['seta', 'diagonal'] },
      { emoji: '↖️', keywords: ['seta', 'diagonal'] },
      { emoji: '↕️', keywords: ['seta', 'vertical'] },
      { emoji: '↔️', keywords: ['seta', 'horizontal'] },
      { emoji: '🔄', keywords: ['recarregar', 'refresh'] },
      { emoji: '🔃', keywords: ['recarregar', 'refresh'] },
      { emoji: '🔀', keywords: ['aleatorio', 'shuffle'] },
      { emoji: '🔁', keywords: ['repetir', 'repeat'] },
      { emoji: '🔂', keywords: ['repetir um', 'repeat one'] },
      { emoji: '▶️', keywords: ['play', 'iniciar'] },
      { emoji: '⏩', keywords: ['avancar', 'fast forward'] },
      { emoji: '⏭️', keywords: ['proximo', 'next'] },
      { emoji: '◀️', keywords: ['voltar', 'back'] },
      { emoji: '⏪', keywords: ['retroceder', 'rewind'] },
      { emoji: '⏮️', keywords: ['anterior', 'previous'] },
      { emoji: '🔼', keywords: ['cima', 'up'] },
      { emoji: '🔽', keywords: ['baixo', 'down'] },
      { emoji: '⏸️', keywords: ['pausar', 'pause'] },
      { emoji: '⏹️', keywords: ['parar', 'stop'] },
      { emoji: '⏺️', keywords: ['gravar', 'record'] },
      { emoji: '🔘', keywords: ['botao', 'radio button'] },
      { emoji: '🔴', keywords: ['circulo', 'vermelho', 'red'] },
      { emoji: '🟠', keywords: ['circulo', 'laranja', 'orange'] },
      { emoji: '🟡', keywords: ['circulo', 'amarelo', 'yellow'] },
      { emoji: '🟢', keywords: ['circulo', 'verde', 'green'] },
      { emoji: '🔵', keywords: ['circulo', 'azul', 'blue'] },
      { emoji: '🟣', keywords: ['circulo', 'roxo', 'purple'] },
      { emoji: '⚫', keywords: ['circulo', 'preto', 'black'] },
      { emoji: '⚪', keywords: ['circulo', 'branco', 'white'] },
      { emoji: '🟤', keywords: ['circulo', 'marrom', 'brown'] },
      { emoji: '🔲', keywords: ['quadrado', 'preto'] },
      { emoji: '🔳', keywords: ['quadrado', 'branco'] },
      { emoji: '▪️', keywords: ['quadrado', 'pequeno', 'preto'] },
      { emoji: '▫️', keywords: ['quadrado', 'pequeno', 'branco'] },
      { emoji: '◾', keywords: ['quadrado', 'medio', 'preto'] },
      { emoji: '◽', keywords: ['quadrado', 'medio', 'branco'] },
      { emoji: '🔶', keywords: ['losango', 'laranja'] },
      { emoji: '🔷', keywords: ['losango', 'azul'] },
      { emoji: '🔸', keywords: ['losango', 'pequeno', 'laranja'] },
      { emoji: '🔹', keywords: ['losango', 'pequeno', 'azul'] },
      { emoji: '♠️', keywords: ['espadas', 'spades'] },
      { emoji: '♣️', keywords: ['paus', 'clubs'] },
      { emoji: '♥️', keywords: ['copas', 'hearts'] },
      { emoji: '♦️', keywords: ['ouros', 'diamonds'] },
    ],
  },
  {
    id: 'nature',
    label: 'Natureza e animais',
    icon: '🌿',
    emojis: [
      { emoji: '☀️', keywords: ['sol', 'sun'] },
      { emoji: '🌤️', keywords: ['sol', 'nuvem', 'partly sunny'] },
      { emoji: '⛅', keywords: ['nuvem', 'cloud'] },
      { emoji: '🌥️', keywords: ['nuvem', 'cloud'] },
      { emoji: '🌦️', keywords: ['chuva', 'sol', 'rain sun'] },
      { emoji: '🌧️', keywords: ['chuva', 'rain'] },
      { emoji: '⛈️', keywords: ['tempestade', 'thunder'] },
      { emoji: '🌩️', keywords: ['raio', 'lightning'] },
      { emoji: '🌪️', keywords: ['tornado'] },
      { emoji: '🌙', keywords: ['lua', 'moon'] },
      { emoji: '🌈', keywords: ['arcoiris', 'rainbow'] },
      { emoji: '⭐', keywords: ['estrela', 'star'] },
      { emoji: '🌠', keywords: ['estrela cadente', 'shooting star'] },
      { emoji: '🌸', keywords: ['flor', 'cerejeira', 'cherry blossom'] },
      { emoji: '🌹', keywords: ['rosa', 'rose'] },
      { emoji: '🌺', keywords: ['hibisco', 'hibiscus'] },
      { emoji: '🌻', keywords: ['girassol', 'sunflower'] },
      { emoji: '🌼', keywords: ['flor', 'blossom'] },
      { emoji: '🌷', keywords: ['tulipa', 'tulip'] },
      { emoji: '🪷', keywords: ['lotus'] },
      { emoji: '🌿', keywords: ['folha', 'planta', 'herb'] },
      { emoji: '🍀', keywords: ['trevo', 'sorte', 'clover'] },
      { emoji: '🍃', keywords: ['folha', 'vento', 'leaf'] },
      { emoji: '🍂', keywords: ['folha', 'outono', 'fallen leaf'] },
      { emoji: '🍁', keywords: ['folha', 'maple'] },
      { emoji: '🌲', keywords: ['arvore', 'evergreen', 'pinheiro'] },
      { emoji: '🌳', keywords: ['arvore', 'tree'] },
      { emoji: '🌴', keywords: ['palmeira', 'palm'] },
      { emoji: '🌵', keywords: ['cacto', 'cactus'] },
      { emoji: '🪴', keywords: ['planta', 'vaso', 'potted'] },
      { emoji: '🐶', keywords: ['cachorro', 'dog'] },
      { emoji: '🐱', keywords: ['gato', 'cat'] },
      { emoji: '🐭', keywords: ['rato', 'mouse'] },
      { emoji: '🐹', keywords: ['hamster'] },
      { emoji: '🐰', keywords: ['coelho', 'rabbit'] },
      { emoji: '🦊', keywords: ['raposa', 'fox'] },
      { emoji: '🐻', keywords: ['urso', 'bear'] },
      { emoji: '🐼', keywords: ['panda'] },
      { emoji: '🐨', keywords: ['coala', 'koala'] },
      { emoji: '🐯', keywords: ['tigre', 'tiger'] },
      { emoji: '🦁', keywords: ['leao', 'lion'] },
      { emoji: '🐮', keywords: ['vaca', 'cow'] },
      { emoji: '🐷', keywords: ['porco', 'pig'] },
      { emoji: '🐸', keywords: ['sapo', 'frog'] },
      { emoji: '🐵', keywords: ['macaco', 'monkey'] },
      { emoji: '🐔', keywords: ['galinha', 'chicken'] },
      { emoji: '🐧', keywords: ['pinguim', 'penguin'] },
      { emoji: '🐦', keywords: ['passaro', 'bird'] },
      { emoji: '🦅', keywords: ['aguia', 'eagle'] },
      { emoji: '🦋', keywords: ['borboleta', 'butterfly'] },
      { emoji: '🐛', keywords: ['inseto', 'bug'] },
      { emoji: '🐝', keywords: ['abelha', 'bee'] },
      { emoji: '🐞', keywords: ['joaninha', 'ladybug'] },
      { emoji: '🐢', keywords: ['tartaruga', 'turtle'] },
      { emoji: '🐍', keywords: ['cobra', 'snake'] },
      { emoji: '🐠', keywords: ['peixe', 'fish'] },
      { emoji: '🐬', keywords: ['golfinho', 'dolphin'] },
      { emoji: '🐳', keywords: ['baleia', 'whale'] },
      { emoji: '🦈', keywords: ['tubarao', 'shark'] },
      { emoji: '🌍', keywords: ['terra', 'mundo', 'earth'] },
      { emoji: '🌎', keywords: ['terra', 'americas', 'earth'] },
      { emoji: '🌏', keywords: ['terra', 'asia', 'earth'] },
    ],
  },
  {
    id: 'food',
    label: 'Comida e bebida',
    icon: '🍔',
    emojis: [
      { emoji: '🍎', keywords: ['maca', 'apple'] },
      { emoji: '🍊', keywords: ['laranja', 'orange'] },
      { emoji: '🍋', keywords: ['limao', 'lemon'] },
      { emoji: '🍌', keywords: ['banana'] },
      { emoji: '🍉', keywords: ['melancia', 'watermelon'] },
      { emoji: '🍇', keywords: ['uva', 'grape'] },
      { emoji: '🍓', keywords: ['morango', 'strawberry'] },
      { emoji: '🫐', keywords: ['mirtilo', 'blueberry'] },
      { emoji: '🍑', keywords: ['pessego', 'peach'] },
      { emoji: '🥭', keywords: ['manga', 'mango'] },
      { emoji: '🍍', keywords: ['abacaxi', 'pineapple'] },
      { emoji: '🥑', keywords: ['abacate', 'avocado'] },
      { emoji: '🥦', keywords: ['brocolis', 'broccoli'] },
      { emoji: '🥕', keywords: ['cenoura', 'carrot'] },
      { emoji: '🌽', keywords: ['milho', 'corn'] },
      { emoji: '🍔', keywords: ['hamburguer', 'burger'] },
      { emoji: '🍕', keywords: ['pizza'] },
      { emoji: '🌭', keywords: ['hot dog', 'cachorro quente'] },
      { emoji: '🍟', keywords: ['batata frita', 'fries'] },
      { emoji: '🥪', keywords: ['sanduiche', 'sandwich'] },
      { emoji: '🌮', keywords: ['taco'] },
      { emoji: '🌯', keywords: ['burrito'] },
      { emoji: '🍝', keywords: ['macarrao', 'pasta', 'spaghetti'] },
      { emoji: '🍜', keywords: ['ramen', 'noodles'] },
      { emoji: '🍣', keywords: ['sushi'] },
      { emoji: '🍱', keywords: ['bento', 'marmita'] },
      { emoji: '🍰', keywords: ['bolo', 'cake'] },
      { emoji: '🎂', keywords: ['bolo', 'aniversario', 'birthday'] },
      { emoji: '🍩', keywords: ['donut', 'rosquinha'] },
      { emoji: '🍪', keywords: ['biscoito', 'cookie'] },
      { emoji: '🍫', keywords: ['chocolate'] },
      { emoji: '🍬', keywords: ['doce', 'candy'] },
      { emoji: '🍭', keywords: ['pirulito', 'lollipop'] },
      { emoji: '🧁', keywords: ['cupcake'] },
      { emoji: '☕', keywords: ['cafe', 'coffee'] },
      { emoji: '🍵', keywords: ['cha', 'tea'] },
      { emoji: '🥤', keywords: ['suco', 'juice', 'cup'] },
      { emoji: '🧃', keywords: ['suco', 'juice box'] },
      { emoji: '🍺', keywords: ['cerveja', 'beer'] },
      { emoji: '🍻', keywords: ['brinde', 'cerveja', 'cheers'] },
      { emoji: '🥂', keywords: ['brinde', 'champagne', 'cheers'] },
      { emoji: '🍷', keywords: ['vinho', 'wine'] },
      { emoji: '🥃', keywords: ['whisky', 'drink'] },
      { emoji: '🧊', keywords: ['gelo', 'ice'] },
    ],
  },
]

/** Fixed-height content area for the emoji grid to prevent popover resizing */
const GRID_HEIGHT = 'h-[220px]'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState(EMOJI_CATEGORIES[0].id)
  const tabsRef = useRef<HTMLDivElement>(null)

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return EMOJI_CATEGORIES

    const query = searchQuery.toLowerCase()
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter(
        (e) =>
          e.emoji.includes(query) ||
          e.keywords.some((k) => k.includes(query))
      ),
    })).filter((cat) => cat.emojis.length > 0)
  }, [searchQuery])

  const handleTabsWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!tabsRef.current) return
    e.preventDefault()
    tabsRef.current.scrollLeft += e.deltaY || e.deltaX
  }, [])

  const renderEmojiGrid = (emojis: Array<{ emoji: string; keywords: string[] }>) => (
    <div className="grid grid-cols-8 gap-0.5">
      {emojis.map((e) => (
        <button
          key={e.emoji}
          type="button"
          className="aspect-square flex items-center justify-center rounded hover:bg-muted text-lg cursor-pointer transition-colors"
          onClick={() => onSelect(e.emoji)}
          title={e.keywords[0]}
          aria-label={e.keywords[0]}
        >
          {e.emoji}
        </button>
      ))}
    </div>
  )

  const isSearching = searchQuery.trim().length > 0
  const activeCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab)

  return (
    <div className="w-full space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pesquisar emoji"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {isSearching ? (
        /* Search results — fixed height */
        <div className={cn(GRID_HEIGHT, 'overflow-y-auto')}>
          {filteredCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum emoji encontrado
            </p>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="mb-2">
                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                  {cat.label}
                </p>
                {renderEmojiGrid(cat.emojis)}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Tabbed categories — fixed height */
        <div>
          {/* Tab icons — horizontal scroll via mouse wheel */}
          <div
            ref={tabsRef}
            onWheel={handleTabsWheel}
            className="flex border-b overflow-x-auto scrollbar-hide"
          >
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  'flex-none px-2.5 py-1.5 text-lg border-b-2 transition-colors cursor-pointer',
                  activeTab === cat.id
                    ? 'border-primary'
                    : 'border-transparent hover:bg-muted/50'
                )}
                title={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Active category content — fixed height */}
          <div className={cn(GRID_HEIGHT, 'overflow-y-auto mt-2')}>
            {activeCategory && (
              <>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  {activeCategory.label}
                </p>
                {renderEmojiGrid(activeCategory.emojis)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
