/**
 * Color Palette & Picker Studio — Gamility Tools
 * Precision Color Space Conversions, Chromatic Harmonies & WCAG 2.1 Engine
 * Copyright © 2026 Gamility. All rights reserved.
 */

(() => {
  'use strict';

  // --- DOM Elements ---
  const nativeColorPicker = document.getElementById('native-color-picker');
  const mainColorPreview = document.getElementById('main-color-preview');
  const btnRandomColor = document.getElementById('btn-random-color');

  // Input Formats
  const inputHex = document.getElementById('input-hex');
  const inputR = document.getElementById('input-r');
  const inputG = document.getElementById('input-g');
  const inputB = document.getElementById('input-b');
  const inputH = document.getElementById('input-h');
  const inputS = document.getElementById('input-s');
  const inputL = document.getElementById('input-l');
  const readoutCmyk = document.getElementById('readout-cmyk');
  const readoutHsv = document.getElementById('readout-hsv');

  // Copy Buttons
  const btnCopyRgb = document.getElementById('btn-copy-rgb');
  const btnCopyHsl = document.getElementById('btn-copy-hsl');
  const copyFormatBtns = document.querySelectorAll('.copy-format-btn');

  // WCAG Accessibility
  const sampleOnWhite = document.getElementById('sample-on-white');
  const sampleOnBlack = document.getElementById('sample-on-black');
  const ratioOnWhite = document.getElementById('ratio-on-white');
  const ratioOnBlack = document.getElementById('ratio-on-black');
  const previewTextWhite = document.getElementById('preview-text-white');
  const previewTextBlack = document.getElementById('preview-text-black');
  const badgesOnWhite = document.getElementById('badges-on-white');
  const badgesOnBlack = document.getElementById('badges-on-black');

  // Harmonies
  const harmonyTabs = document.querySelectorAll('.harmony-tab');
  const paletteStrip = document.getElementById('palette-strip');
  const btnExportCss = document.getElementById('btn-export-css');
  const btnExportPng = document.getElementById('btn-export-png');

  // Shades & Tints
  const shadesTintsContainer = document.getElementById('shades-tints-container');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // State
  let currentRgb = { r: 59, g: 130, b: 246 }; // Default #3B82F6
  let activeHarmony = 'analogous';
  const lockedSwatches = [false, false, false, false, false];
  let currentPaletteColors = ['#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8', '#1E40AF'];
  let toastTimer = null;

  // --- Toast Notification ---
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  // ==========================================================================
  // COLOR MATHEMATICAL TRANSFORMATIONS
  // ==========================================================================

  function hexToRgb(hex) {
    let clean = hex.replace(/^#/, '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(clean)) {
      return null;
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHex(r, g, b) {
    const clamp = val => Math.max(0, Math.min(255, Math.round(val)));
    const toHexPart = val => clamp(val).toString(16).padStart(2, '0').toUpperCase();
    return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h, s, v = max;

    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100)
    };
  }

  function rgbToCmyk(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  }

  // ==========================================================================
  // WCAG 2.1 ACCESSIBILITY & CONTRAST FORMULAS
  // ==========================================================================

  function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(rgb1, rgb2) {
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  function updateAccessibility(rgb) {
    const whiteRgb = { r: 255, g: 255, b: 255 };
    const blackRgb = { r: 0, g: 0, b: 0 };

    const ratioWhite = getContrastRatio(rgb, whiteRgb);
    const ratioBlack = getContrastRatio(rgb, blackRgb);

    ratioOnWhite.textContent = `${ratioWhite.toFixed(2)} : 1`;
    ratioOnBlack.textContent = `${ratioBlack.toFixed(2)} : 1`;

    const hexColor = rgbToHex(rgb.r, rgb.g, rgb.b);

    // Apply color to sample texts
    previewTextWhite.style.color = hexColor;
    previewTextBlack.style.color = hexColor;

    // Badges on White
    renderWcagBadges(badgesOnWhite, ratioWhite);
    // Badges on Black
    renderWcagBadges(badgesOnBlack, ratioBlack);
  }

  function renderWcagBadges(container, ratio) {
    const aaNormal = ratio >= 4.5;
    const aaLarge = ratio >= 3.0;
    const aaaNormal = ratio >= 7.0;

    container.innerHTML = `
      <span class="comp-badge ${aaNormal ? 'badge-pass' : 'badge-fail'}">AA Normal</span>
      <span class="comp-badge ${aaLarge ? 'badge-pass' : 'badge-fail'}">AA Large</span>
      <span class="comp-badge ${aaaNormal ? 'badge-pass' : 'badge-fail'}">AAA</span>
    `;
  }

  // ==========================================================================
  // CHROMATIC HARMONY GENERATOR
  // ==========================================================================

  function calculateHarmonies(baseHsl) {
    const { h, s, l } = baseHsl;
    let targetHues = [];

    switch (activeHarmony) {
      case 'analogous':
        targetHues = [
          (h - 40 + 360) % 360,
          (h - 20 + 360) % 360,
          h,
          (h + 20) % 360,
          (h + 40) % 360
        ];
        return targetHues.map((hue, idx) => {
          if (idx === 2) return rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);
          const rgb = hslToRgb(hue, s, l);
          return rgbToHex(rgb.r, rgb.g, rgb.b);
        });

      case 'complementary':
        return [
          rgbToHex(...Object.values(hslToRgb(h, s, Math.max(20, l - 20)))),
          rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b),
          rgbToHex(...Object.values(hslToRgb((h + 180) % 360, s, l))),
          rgbToHex(...Object.values(hslToRgb((h + 180) % 360, s, Math.min(85, l + 20)))),
          rgbToHex(...Object.values(hslToRgb((h + 180) % 360, Math.max(25, s - 25), l)))
        ];

      case 'triadic':
        return [
          rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b),
          rgbToHex(...Object.values(hslToRgb(h, s, Math.min(85, l + 18)))),
          rgbToHex(...Object.values(hslToRgb((h + 120) % 360, s, l))),
          rgbToHex(...Object.values(hslToRgb((h + 240) % 360, s, l))),
          rgbToHex(...Object.values(hslToRgb((h + 240) % 360, s, Math.max(20, l - 20))))
        ];

      case 'tetradic':
        return [
          rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b),
          rgbToHex(...Object.values(hslToRgb((h + 90) % 360, s, l))),
          rgbToHex(...Object.values(hslToRgb((h + 180) % 360, s, l))),
          rgbToHex(...Object.values(hslToRgb((h + 270) % 360, s, l))),
          rgbToHex(...Object.values(hslToRgb((h + 180) % 360, s, Math.min(85, l + 20))))
        ];

      case 'monochromatic':
        return [
          rgbToHex(...Object.values(hslToRgb(h, s, Math.max(15, l - 35)))),
          rgbToHex(...Object.values(hslToRgb(h, s, Math.max(25, l - 18)))),
          rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b),
          rgbToHex(...Object.values(hslToRgb(h, Math.max(20, s - 10), Math.min(80, l + 18)))),
          rgbToHex(...Object.values(hslToRgb(h, Math.max(15, s - 25), Math.min(92, l + 32))))
        ];

      default:
        return [rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b)];
    }
  }

  function updateHarmonies() {
    const baseHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
    const newColors = calculateHarmonies(baseHsl);

    for (let i = 0; i < 5; i++) {
      if (!lockedSwatches[i]) {
        currentPaletteColors[i] = newColors[i] || '#3B82F6';
      }
    }

    renderPaletteCards();
  }

  function renderPaletteCards() {
    let html = '';
    currentPaletteColors.forEach((hex, idx) => {
      const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
      const isLocked = lockedSwatches[idx];

      html += `
        <div class="palette-card">
          <div class="palette-swatch-box" style="background-color: ${hex};">
            <button class="lock-swatch-btn ${isLocked ? 'is-locked' : ''}" data-index="${idx}" type="button" title="${isLocked ? 'Unlock color' : 'Lock color'}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                ${isLocked 
                  ? '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>'
                  : '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>'}
              </svg>
            </button>
          </div>
          <div class="palette-meta-box">
            <button class="palette-hex-btn" data-hex="${hex}" type="button" title="Click to copy HEX">${hex}</button>
            <span class="palette-rgb-val">rgb(${rgb.r}, ${rgb.g}, ${rgb.b})</span>
          </div>
        </div>
      `;
    });

    paletteStrip.innerHTML = html;

    // Attach click events
    paletteStrip.querySelectorAll('.lock-swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        lockedSwatches[idx] = !lockedSwatches[idx];
        renderPaletteCards();
        showToast(lockedSwatches[idx] ? `Locked color ${idx + 1}` : `Unlocked color ${idx + 1}`);
      });
    });

    paletteStrip.querySelectorAll('.palette-hex-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hexVal = btn.getAttribute('data-hex');
        copyToClipboard(hexVal, `Copied ${hexVal} to clipboard!`);
      });
    });
  }

  // ==========================================================================
  // SHADES & TINTS SCALE
  // ==========================================================================

  function updateShadesAndTints() {
    const hsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
    let html = '';

    // 10 steps: 5 shades (down to 10%), base, 4 tints (up to 95%)
    const lightnessSteps = [
      Math.max(6, Math.round(hsl.l * 0.15)),
      Math.max(12, Math.round(hsl.l * 0.35)),
      Math.max(18, Math.round(hsl.l * 0.55)),
      Math.max(24, Math.round(hsl.l * 0.75)),
      Math.max(28, Math.round(hsl.l * 0.90)),
      hsl.l, // Base
      Math.min(75, Math.round(hsl.l + (100 - hsl.l) * 0.25)),
      Math.min(84, Math.round(hsl.l + (100 - hsl.l) * 0.50)),
      Math.min(92, Math.round(hsl.l + (100 - hsl.l) * 0.72)),
      Math.min(97, Math.round(hsl.l + (100 - hsl.l) * 0.90))
    ];

    lightnessSteps.forEach(lVal => {
      const rgb = hslToRgb(hsl.h, hsl.s, lVal);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

      html += `
        <div class="shade-item" style="background-color: ${hex};" data-hex="${hex}" title="Click to use ${hex}">
          <span class="shade-hex-tag">${hex}</span>
        </div>
      `;
    });

    shadesTintsContainer.innerHTML = html;

    shadesTintsContainer.querySelectorAll('.shade-item').forEach(item => {
      item.addEventListener('click', () => {
        const hex = item.getAttribute('data-hex');
        setColorFromHex(hex);
        showToast(`Selected shade: ${hex}`);
      });
    });
  }

  // ==========================================================================
  // PRIMARY SYNCHRONIZATION CONTROLLER
  // ==========================================================================

  function updateAllViews(source = '') {
    const hex = rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);
    const hsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
    const hsv = rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b);
    const cmyk = rgbToCmyk(currentRgb.r, currentRgb.g, currentRgb.b);

    // Update main preview block
    mainColorPreview.style.backgroundColor = hex;
    nativeColorPicker.value = hex;

    // Update Formats (avoid overwriting active focused input)
    if (source !== 'hex') inputHex.value = hex.replace('#', '');
    if (source !== 'rgb') {
      inputR.value = currentRgb.r;
      inputG.value = currentRgb.g;
      inputB.value = currentRgb.b;
    }
    if (source !== 'hsl') {
      inputH.value = hsl.h;
      inputS.value = hsl.s;
      inputL.value = hsl.l;
    }

    readoutCmyk.textContent = `CMYK: ${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`;
    readoutHsv.textContent = `HSV: ${hsv.h}°, ${hsv.s}%, ${hsv.v}%`;

    // Accessibility
    updateAccessibility(currentRgb);

    // Harmonies
    updateHarmonies();

    // Shades & Tints
    updateShadesAndTints();
  }

  function setColorFromHex(hexStr) {
    const rgb = hexToRgb(hexStr);
    if (rgb) {
      currentRgb = rgb;
      updateAllViews('hex');
    }
  }

  // --- Clipboard Helper ---
  async function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(successMsg);
    } catch (e) {
      showToast('Copied to clipboard!');
    }
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  // Native Picker
  nativeColorPicker.addEventListener('input', () => {
    setColorFromHex(nativeColorPicker.value);
  });

  // HEX Input
  inputHex.addEventListener('input', () => {
    const val = inputHex.value.trim();
    if (val.length === 3 || val.length === 6) {
      const rgb = hexToRgb(val);
      if (rgb) {
        currentRgb = rgb;
        updateAllViews('hex');
      }
    }
  });

  // RGB Inputs
  [inputR, inputG, inputB].forEach(input => {
    input.addEventListener('input', () => {
      const r = Math.max(0, Math.min(255, parseInt(inputR.value, 10) || 0));
      const g = Math.max(0, Math.min(255, parseInt(inputG.value, 10) || 0));
      const b = Math.max(0, Math.min(255, parseInt(inputB.value, 10) || 0));
      currentRgb = { r, g, b };
      updateAllViews('rgb');
    });
  });

  // HSL Inputs
  [inputH, inputS, inputL].forEach(input => {
    input.addEventListener('input', () => {
      const h = Math.max(0, Math.min(360, parseInt(inputH.value, 10) || 0));
      const s = Math.max(0, Math.min(100, parseInt(inputS.value, 10) || 0));
      const l = Math.max(0, Math.min(100, parseInt(inputL.value, 10) || 0));
      currentRgb = hslToRgb(h, s, l);
      updateAllViews('hsl');
    });
  });

  // Random Color Button
  btnRandomColor.addEventListener('click', () => {
    const randomRgb = {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256)
    };
    currentRgb = randomRgb;
    updateAllViews();
    showToast(`Generated random color: ${rgbToHex(randomRgb.r, randomRgb.g, randomRgb.b)}`);
  });

  // Spacebar quick randomize (when not typing in an input)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      btnRandomColor.click();
    }
  });

  // Copy Buttons
  copyFormatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy-target');
      if (targetId) {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const val = `#${targetEl.value.replace('#', '')}`;
          copyToClipboard(val, `Copied ${val} to clipboard!`);
        }
      }
    });
  });

  btnCopyRgb.addEventListener('click', () => {
    const val = `rgb(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b})`;
    copyToClipboard(val, `Copied ${val} to clipboard!`);
  });

  btnCopyHsl.addEventListener('click', () => {
    const hsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
    const val = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    copyToClipboard(val, `Copied ${val} to clipboard!`);
  });

  // Harmony Tabs
  harmonyTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      harmonyTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeHarmony = tab.getAttribute('data-harmony');
      updateHarmonies();
    });
  });

  // Export CSS Variables
  btnExportCss.addEventListener('click', () => {
    const cssVars = [
      ':root {',
      `  --color-base: ${currentPaletteColors[0]};`,
      `  --color-secondary: ${currentPaletteColors[1]};`,
      `  --color-accent: ${currentPaletteColors[2]};`,
      `  --color-shade: ${currentPaletteColors[3]};`,
      `  --color-tint: ${currentPaletteColors[4]};`,
      '}'
    ].join('\n');

    copyToClipboard(cssVars, 'Copied CSS custom properties to clipboard!');
  });

  // Export PNG Image
  btnExportPng.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    const sliceWidth = canvas.width / 5;
    currentPaletteColors.forEach((hex, idx) => {
      ctx.fillStyle = hex;
      ctx.fillRect(idx * sliceWidth, 0, sliceWidth, canvas.height);

      // Label background pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(idx * sliceWidth + 15, canvas.height - 70, sliceWidth - 30, 45);

      // Text label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hex, idx * sliceWidth + (sliceWidth / 2), canvas.height - 42);
    });

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gamility-palette-${activeHarmony}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported Palette PNG Image');
    });
  });

  // --- Initialize ---
  window.addEventListener('DOMContentLoaded', () => {
    updateAllViews();
  });

})();
