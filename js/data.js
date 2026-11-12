// ヘブライ語の学習データ
// letters: アレフベート22文字 + 語末形5文字
// words:   基本単語（カテゴリ別）

export const LETTERS = [
  { id: 'alef',   char: 'א', name: 'アレフ',   nameHe: 'אָלֶף',  latin: 'Alef',   sound: '無音（母音の土台）', example: { he: 'אבא',   tr: 'aba',     ja: 'お父さん' } },
  { id: 'bet',    char: 'ב', name: 'ベート',   nameHe: 'בֵּית',  latin: 'Bet / Vet', sound: 'b / v',        example: { he: 'בית',   tr: 'bayit',   ja: '家' } },
  { id: 'gimel',  char: 'ג', name: 'ギメル',   nameHe: 'גִּימֶל', latin: 'Gimel',  sound: 'g',                example: { he: 'גדול',  tr: 'gadol',   ja: '大きい' } },
  { id: 'dalet',  char: 'ד', name: 'ダレット', nameHe: 'דָּלֶת', latin: 'Dalet',  sound: 'd',                example: { he: 'דלת',   tr: 'delet',   ja: 'ドア' } },
  { id: 'he',     char: 'ה', name: 'ヘー',     nameHe: 'הֵא',    latin: 'He',     sound: 'h（語末では無音）', example: { he: 'הר',    tr: 'har',     ja: '山' } },
  { id: 'vav',    char: 'ו', name: 'ヴァヴ',   nameHe: 'וָו',    latin: 'Vav',    sound: 'v（母音 o / u にも）', example: { he: 'ורד', tr: 'vered',   ja: 'バラ' } },
  { id: 'zayin',  char: 'ז', name: 'ザイン',   nameHe: 'זַיִן',  latin: 'Zayin',  sound: 'z',                example: { he: 'זמן',   tr: 'zman',    ja: '時間' } },
  { id: 'chet',   char: 'ח', name: 'ヘット',   nameHe: 'חֵית',   latin: 'Chet',   sound: 'ch（喉の奥の「ハ」）', example: { he: 'חתול', tr: 'chatul', ja: '猫' } },
  { id: 'tet',    char: 'ט', name: 'テット',   nameHe: 'טֵית',   latin: 'Tet',    sound: 't',                example: { he: 'טוב',   tr: 'tov',     ja: '良い' } },
  { id: 'yod',    char: 'י', name: 'ヨッド',   nameHe: 'יוֹד',   latin: 'Yod',    sound: 'y（母音 i にも）', example: { he: 'ים',    tr: 'yam',     ja: '海' } },
  { id: 'kaf',    char: 'כ', name: 'カフ',     nameHe: 'כַּף',   latin: 'Kaf / Khaf', sound: 'k / kh',      example: { he: 'כלב',   tr: 'kelev',   ja: '犬' } },
  { id: 'lamed',  char: 'ל', name: 'ラメッド', nameHe: 'לָמֶד',  latin: 'Lamed',  sound: 'l',                example: { he: 'לחם',   tr: 'lechem',  ja: 'パン' } },
  { id: 'mem',    char: 'מ', name: 'メム',     nameHe: 'מֵם',    latin: 'Mem',    sound: 'm',                example: { he: 'מים',   tr: 'mayim',   ja: '水' } },
  { id: 'nun',    char: 'נ', name: 'ヌン',     nameHe: 'נוּן',   latin: 'Nun',    sound: 'n',                example: { he: 'נר',    tr: 'ner',     ja: 'ろうそく' } },
  { id: 'samekh', char: 'ס', name: 'サメフ',   nameHe: 'סָמֶךְ', latin: 'Samekh', sound: 's',                example: { he: 'ספר',   tr: 'sefer',   ja: '本' } },
  { id: 'ayin',   char: 'ע', name: 'アイン',   nameHe: 'עַיִן',  latin: 'Ayin',   sound: '無音（現代語）',   example: { he: 'עץ',    tr: 'etz',     ja: '木' } },
  { id: 'pe',     char: 'פ', name: 'ペー',     nameHe: 'פֵּא',   latin: 'Pe / Fe', sound: 'p / f',           example: { he: 'פרח',   tr: 'perach',  ja: '花' } },
  { id: 'tsadi',  char: 'צ', name: 'ツァディ', nameHe: 'צָדִי',  latin: 'Tsadi',  sound: 'ts',               example: { he: 'ציפור', tr: 'tsipor',  ja: '鳥' } },
  { id: 'qof',    char: 'ק', name: 'コフ',     nameHe: 'קוֹף',   latin: 'Qof',    sound: 'k',                example: { he: 'קפה',   tr: 'kafe',    ja: 'コーヒー' } },
  { id: 'resh',   char: 'ר', name: 'レーシュ', nameHe: 'רֵישׁ',  latin: 'Resh',   sound: 'r（喉の「ル」）',  example: { he: 'ראש',   tr: 'rosh',    ja: '頭' } },
  { id: 'shin',   char: 'ש', name: 'シン',     nameHe: 'שִׁין',  latin: 'Shin / Sin', sound: 'sh / s',      example: { he: 'שמש',   tr: 'shemesh', ja: '太陽' } },
  { id: 'tav',    char: 'ת', name: 'タヴ',     nameHe: 'תָּו',   latin: 'Tav',    sound: 't',                example: { he: 'תפוח',  tr: 'tapuach', ja: 'りんご' } },
  // 語末形（単語の最後に来たときの形）
  { id: 'kaf-f',   char: 'ך', name: 'カフ・ソフィート',     nameHe: 'כַּף סוֹפִית',  latin: 'Final Kaf',   sound: 'kh（語末形）', final: 'כ', example: { he: 'דרך', tr: 'derekh', ja: '道' } },
  { id: 'mem-f',   char: 'ם', name: 'メム・ソフィート',     nameHe: 'מֵם סוֹפִית',   latin: 'Final Mem',   sound: 'm（語末形）',  final: 'מ', example: { he: 'ים',  tr: 'yam',    ja: '海' } },
  { id: 'nun-f',   char: 'ן', name: 'ヌン・ソフィート',     nameHe: 'נוּן סוֹפִית',  latin: 'Final Nun',   sound: 'n（語末形）',  final: 'נ', example: { he: 'לבן', tr: 'lavan',  ja: '白' } },
  { id: 'pe-f',    char: 'ף', name: 'ペー・ソフィート',     nameHe: 'פֵּא סוֹפִית',  latin: 'Final Pe',    sound: 'f（語末形）',  final: 'פ', example: { he: 'כסף', tr: 'kesef',  ja: 'お金' } },
  { id: 'tsadi-f', char: 'ץ', name: 'ツァディ・ソフィート', nameHe: 'צָדִי סוֹפִית', latin: 'Final Tsadi', sound: 'ts（語末形）', final: 'צ', example: { he: 'עץ',  tr: 'etz',    ja: '木' } },
];

export const CATEGORIES = [
  { id: 'greet',  name: 'あいさつ',   icon: '👋' },
  { id: 'family', name: '家族・人',   icon: '👪' },
  { id: 'food',   name: '食べ物',     icon: '🍎' },
  { id: 'nature', name: '自然',       icon: '🌳' },
  { id: 'color',  name: '色',         icon: '🎨' },
  { id: 'number', name: '数',         icon: '🔢' },
  { id: 'home',   name: '家・街',     icon: '🏠' },
  { id: 'body',   name: '体',         icon: '✋' },
  { id: 'time',   name: '時間',       icon: '⏰' },
  { id: 'adj',    name: '形容詞',     icon: '📏' },
];

// 数は「数えるとき」に使う女性形
const W = (id, cat, he, tr, ja) => ({ id, cat, he, tr, ja });
export const WORDS = [
  W('shalom',    'greet',  'שלום',      'shalom',     'こんにちは／平和'),
  W('toda',      'greet',  'תודה',      'toda',       'ありがとう'),
  W('ken',       'greet',  'כן',        'ken',        'はい'),
  W('lo',        'greet',  'לא',        'lo',         'いいえ'),
  W('bevakasha', 'greet',  'בבקשה',     'bevakasha',  'お願いします／どうぞ'),
  W('boker-tov', 'greet',  'בוקר טוב',  'boker tov',  'おはよう'),
  W('laila-tov', 'greet',  'לילה טוב',  'laila tov',  'おやすみ'),

  W('aba',    'family', 'אבא',   'aba',    'お父さん'),
  W('ima',    'family', 'אמא',   'ima',    'お母さん'),
  W('ach',    'family', 'אח',    'ach',    '兄弟'),
  W('achot',  'family', 'אחות',  'achot',  '姉妹'),
  W('yeled',  'family', 'ילד',   'yeled',  '男の子'),
  W('yalda',  'family', 'ילדה',  'yalda',  '女の子'),
  W('chaver', 'family', 'חבר',   'chaver', '友達'),

  W('mayim',   'food', 'מים',   'mayim',   '水'),
  W('lechem',  'food', 'לחם',   'lechem',  'パン'),
  W('chalav',  'food', 'חלב',   'chalav',  '牛乳'),
  W('kafe',    'food', 'קפה',   'kafe',    'コーヒー'),
  W('tapuach', 'food', 'תפוח',  'tapuach', 'りんご'),
  W('ochel',   'food', 'אוכל',  'ochel',   '食べ物'),

  W('shemesh', 'nature', 'שמש',  'shemesh', '太陽'),
  W('yareach', 'nature', 'ירח',  'yareach', '月'),
  W('yam',     'nature', 'ים',   'yam',     '海'),
  W('etz',     'nature', 'עץ',   'etz',     '木'),
  W('perach',  'nature', 'פרח',  'perach',  '花'),
  W('har',     'nature', 'הר',   'har',     '山'),
  W('kelev',   'nature', 'כלב',  'kelev',   '犬'),
  W('chatul',  'nature', 'חתול', 'chatul',  '猫'),

  W('adom',   'color', 'אדום',  'adom',   '赤'),
  W('kachol', 'color', 'כחול',  'kachol', '青'),
  W('yarok',  'color', 'ירוק',  'yarok',  '緑'),
  W('lavan',  'color', 'לבן',   'lavan',  '白'),
  W('shachor','color', 'שחור',  'shachor','黒'),

  W('achat',  'number', 'אחת',    'achat',   '1'),
  W('shtayim','number', 'שתיים',  'shtayim', '2'),
  W('shalosh','number', 'שלוש',   'shalosh', '3'),
  W('arba',   'number', 'ארבע',   'arba',    '4'),
  W('chamesh','number', 'חמש',    'chamesh', '5'),
  W('shesh',  'number', 'שש',     'shesh',   '6'),
  W('sheva',  'number', 'שבע',    'sheva',   '7'),
  W('shmone', 'number', 'שמונה',  'shmone',  '8'),
  W('tesha',  'number', 'תשע',    'tesha',   '9'),
  W('eser',   'number', 'עשר',    'eser',    '10'),

  W('bayit',   'home', 'בית',     'bayit',    '家'),
  W('sefer',   'home', 'ספר',     'sefer',    '本'),
  W('delet',   'home', 'דלת',     'delet',    'ドア'),
  W('chalon',  'home', 'חלון',    'chalon',   '窓'),
  W('shulchan','home', 'שולחן',   'shulchan', 'テーブル'),
  W('kise',    'home', 'כיסא',    'kise',     '椅子'),
  W('ir',      'home', 'עיר',     'ir',       '街・都市'),
  W('rechov',  'home', 'רחוב',    'rechov',   '通り'),
  W('mechonit','home', 'מכונית',  'mechonit', '車'),

  W('yad',  'body', 'יד',   'yad',  '手'),
  W('ayin', 'body', 'עין',  'ayin', '目'),
  W('rosh', 'body', 'ראש',  'rosh', '頭'),
  W('lev',  'body', 'לב',   'lev',  '心臓／心'),

  W('yom',   'time', 'יום',  'yom',   '日・昼'),
  W('laila', 'time', 'לילה', 'laila', '夜'),
  W('zman',  'time', 'זמן',  'zman',  '時間'),
  W('boker', 'time', 'בוקר', 'boker', '朝'),

  W('gadol', 'adj', 'גדול', 'gadol', '大きい'),
  W('katan', 'adj', 'קטן',  'katan', '小さい'),
  W('tov',   'adj', 'טוב',  'tov',   '良い'),

];
