import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from '../utils/csv.js';

// Values a user can type into party, description or invoice number and that
// arrive in the CSV export. Each must be neutralised, because the file is
// opened by a spreadsheet rather than read as text.
const DANGEROUS = [
  ['=HYPERLINK("http://example.invalid","click")', 'equals'],
  ['+91 98765 43210', 'plus'],
  ['-1+2', 'hyphen that is not a number'],
  ['@SUM(A1:A9)', 'at sign'],
  ['\tleading tab', 'tab'],
  ['\rleading carriage return', 'carriage return']
];

test('formula-leading values are prefixed so a spreadsheet treats them as text', () => {
  for (const [value, label] of DANGEROUS) {
    const cell = csvCell(value);
    assert.ok(cell.startsWith('"\''), `${label} should be prefixed with a single quote, got ${cell}`);
    assert.ok(cell.endsWith('"'), `${label} should still be quoted`);
  }
});

test('a prefixed formula keeps its content and doubles any inner quotes', () => {
  assert.equal(csvCell('=HYPERLINK("http://example.invalid","click")'), `"'=HYPERLINK(""http://example.invalid"",""click"")"`);
});

test('legitimate negative amounts are left exactly as they are', () => {
  // This is the case a naive "prefix every hyphen" rule breaks.
  for (const value of ['-42.50', '-0.01', '-42', '-1180.00']) {
    assert.equal(csvCell(value), `"${value}"`, `${value} is a number and must not be altered`);
  }
});

test('ordinary text and numbers are unchanged from the previous escaping', () => {
  assert.equal(csvCell('Mehta Kirana Stores'), '"Mehta Kirana Stores"');
  assert.equal(csvCell('1000'), '"1000"');
  assert.equal(csvCell('27AABCU9603R1ZM'), '"27AABCU9603R1ZM"');
  assert.equal(csvCell(1180), '"1180"', 'numbers are stringified, not reformatted');
});

test('embedded double quotes are doubled and missing values become empty cells', () => {
  assert.equal(csvCell('Rao "Home" Needs'), '"Rao ""Home"" Needs"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
  assert.equal(csvCell(''), '""');
});

test('toCsv joins cells with commas and rows with CRLF', () => {
  const csv = toCsv([['Type', 'Party'], ['sale', '=a'], ['purchase', '-42.50']]);
  assert.equal(csv, '"Type","Party"\r\n"sale","\'=a"\r\n"purchase","-42.50"');
});

test('a row of dangerous values can never start a formula in any cell', () => {
  // Checked per value rather than by splitting the CSV: a quoted cell may
  // contain a comma, so splitting on commas yields fragments that are not
  // cells and would make this assertion pass no matter what the encoder did.
  for (const [value, label] of DANGEROUS) {
    const inner = csvCell(value).slice(1, -1).replaceAll('""', '"');
    assert.ok(
      !/^[=+@\t\r]/.test(inner),
      `${label} must not begin with a formula lead in the finished cell, got ${JSON.stringify(inner)}`
    );
  }
});
