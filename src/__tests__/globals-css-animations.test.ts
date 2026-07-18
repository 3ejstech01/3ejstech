import fs from 'fs';
import path from 'path';

it('includes ink fill animation keyframes', () => {
  const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf-8');
  expect(css).toContain('@keyframes inkFill');
});

it('includes border glow animation keyframes', () => {
  const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf-8');
  expect(css).toContain('@keyframes borderGlow');
});

it('includes nav-ink-fill utility class', () => {
  const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf-8');
  expect(css).toContain('.nav-ink-fill');
});

it('includes nav-border-glow utility class', () => {
  const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf-8');
  expect(css).toContain('.nav-border-glow');
});

it('includes slideDown animation for mobile menu', () => {
  const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf-8');
  expect(css).toContain('@keyframes slideDown');
});