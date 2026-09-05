import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  SUPPORTED_THEMES,
  THEME_STORAGE_KEY,
  htmlLang,
  localeOptions,
  parseLocale,
  parseTheme,
  readStoredPreference,
  translateText,
  writeStoredPreference,
} from '../lib/i18n.ts';

const han = /\p{Script=Han}/u;

void test('locale and theme parsers accept only supported exact values', () => {
  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(parseLocale(locale), locale);
    assert.equal(htmlLang(locale), locale);
  }
  for (const theme of SUPPORTED_THEMES) {
    assert.equal(parseTheme(theme), theme);
  }

  for (const invalid of [null, undefined, '', 'EN', 'zh-TW', 'system', 1]) {
    assert.equal(parseLocale(invalid), null);
    assert.equal(parseTheme(invalid), null);
  }

  assert.equal(DEFAULT_LOCALE, 'zh-CN');
  assert.equal(DEFAULT_THEME, 'light');
  assert.deepEqual(
    localeOptions.map(({ value }) => value),
    [...SUPPORTED_LOCALES],
  );
  assert.equal(
    new Set(localeOptions.map(({ shortLabel }) => shortLabel)).size,
    localeOptions.length,
  );
});

void test('stored preferences fall back when storage is unavailable or invalid', () => {
  const values = new Map<string, string>([
    [LOCALE_STORAGE_KEY, 'en'],
    [THEME_STORAGE_KEY, 'dark'],
  ]);
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
  };

  assert.equal(
    readStoredPreference(
      storage,
      LOCALE_STORAGE_KEY,
      parseLocale,
      DEFAULT_LOCALE,
    ),
    'en',
  );
  assert.equal(
    readStoredPreference(storage, THEME_STORAGE_KEY, parseTheme, DEFAULT_THEME),
    'dark',
  );

  values.set(LOCALE_STORAGE_KEY, 'fr');
  assert.equal(
    readStoredPreference(
      storage,
      LOCALE_STORAGE_KEY,
      parseLocale,
      DEFAULT_LOCALE,
    ),
    DEFAULT_LOCALE,
  );

  const throwingStorage = {
    getItem(): string | null {
      throw new Error('SecurityError');
    },
  };
  assert.equal(
    readStoredPreference(
      throwingStorage,
      LOCALE_STORAGE_KEY,
      parseLocale,
      DEFAULT_LOCALE,
    ),
    DEFAULT_LOCALE,
  );
  assert.equal(
    readStoredPreference(null, THEME_STORAGE_KEY, parseTheme, DEFAULT_THEME),
    DEFAULT_THEME,
  );
});

void test('preference writes are isolated and storage failures are non-fatal', () => {
  const values = new Map<string, string>();
  const storage = {
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };

  assert.equal(
    writeStoredPreference(storage, LOCALE_STORAGE_KEY, 'zh-HK'),
    true,
  );
  assert.equal(writeStoredPreference(storage, THEME_STORAGE_KEY, 'dark'), true);
  assert.deepEqual(Object.fromEntries(values), {
    [LOCALE_STORAGE_KEY]: 'zh-HK',
    [THEME_STORAGE_KEY]: 'dark',
  });

  const throwingStorage = {
    setItem(): void {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(
    writeStoredPreference(throwingStorage, LOCALE_STORAGE_KEY, 'en'),
    false,
  );
  assert.equal(writeStoredPreference(null, THEME_STORAGE_KEY, 'light'), false);
});

void test('simplified and traditional output cover real interface copy', () => {
  const source = '当前输入没有可行解';

  assert.equal(translateText('zh-CN', source), source);
  assert.equal(translateText('zh-HK', source), '當前輸入沒有可行解');
  assert.equal(
    translateText('zh-HK', '净赎回金额与当前持仓'),
    '淨贖回金額與當前持倉',
  );
  assert.equal(
    translateText('zh-HK', '机构报价、归属与对账'),
    '機構報價、歸屬與對賬',
  );
});

void test('representative English interface copy contains no Chinese', () => {
  const sources = [
    'MMF 配置台',
    '配置测算',
    '当前持仓与机构',
    '切换至深色模式',
    '切换至浅色模式',
    '交易后机构占比',
    '元',
    '万元',
    '百万元',
    '亿元',
  ];

  for (const source of sources) {
    const translated = translateText('en', source);
    assert.notEqual(translated, source, `missing English copy for: ${source}`);
    assert.doesNotMatch(
      translated,
      han,
      `English output still contains Chinese: ${source} -> ${translated}`,
    );
  }
});

void test('dynamic solver messages translate without losing business data', () => {
  const messages = [
    {
      source: '在 SFC WAM ≤ 60 天及另一项当前约束下，最高只能达到 2.755%。',
      tokens: ['SFC', 'WAM', '60', '2.755%'],
    },
    {
      source:
        '目标 ≥ 2.755%；最低 WAM 上限 31.45 天；本解 2.755%。推荐金额与比例已同步更新。',
      tokens: ['2.755%', 'WAM', '31.45'],
    },
    {
      source: 'Institution A现有敞口已超过交易后上限，新增配置无法修复。',
      tokens: ['Institution A'],
    },
    {
      source:
        '当前持仓合计（99.5）比当前 AUM（100）少 0.5；请补录持仓或计入现金及其他。',
      tokens: ['99.5', '100', '0.5'],
    },
    {
      source: '「Custom Product」报价额度',
      tokens: ['Custom Product'],
    },
    {
      source: '上限输入错误：WAM 不得小于 0 天。',
      tokens: ['WAM', '0'],
    },
    {
      source: 'Institution A：集中度上限必须是有效数字。',
      tokens: ['Institution A'],
    },
  ];

  for (const { source, tokens } of messages) {
    const translated = translateText('en', source);
    assert.notEqual(translated, source);
    assert.doesNotMatch(translated, han);
    for (const token of tokens) assert.ok(translated.includes(token));
  }
});

void test('unknown user-authored text is preserved', () => {
  assert.equal(translateText('en', 'Custom Institution'), 'Custom Institution');
  assert.equal(
    translateText('zh-HK', 'Custom Institution'),
    'Custom Institution',
  );
});
