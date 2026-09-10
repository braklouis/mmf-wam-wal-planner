import assert from 'node:assert/strict';
import test from 'node:test';
import { ocrWordsToQuoteTable } from '../lib/quote-ocr.ts';

const word = (text: string, x0: number, y0: number, x1 = x0 + 20, y1 = y0 + 10) => ({ text, bbox: { x0, y0, x1, y1 } });

void test('OCR table preserves a blank middle quote cell', () => {
  const words = [
    word('Bank', 10, 0), word('1W', 110, 0), word('1M', 210, 0),
    word('Alpha', 10, 30), word('2.5%', 110, 30), word('3.1%', 210, 30),
    word('Beta', 10, 60), word('3.2%', 210, 60),
  ];
  assert.equal(ocrWordsToQuoteTable(words), 'Bank\t1W\t1M\nAlpha\t2.5%\t3.1%\nBeta\t\t3.2%');
});

void test('OCR table joins multiple words in a bank name', () => {
  const words = [word('Bank', 10, 0), word('1W', 110, 0), word('North', 10, 30), word('Star', 42, 30), word('2.8%', 110, 30)];
  assert.equal(ocrWordsToQuoteTable(words), 'Bank\t1W\nNorth Star\t2.8%');
});

void test('OCR table fails clearly when the header is not recognized', () => {
  assert.throws(() => ocrWordsToQuoteTable([word('Institution', 10, 0), word('1W', 110, 0), word('A', 10, 30), word('2.8%', 110, 30)]), /无法识别报价表头/);
});
