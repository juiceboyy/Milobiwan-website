/**
 * Milobiwan (Mieke) – Native Poem Share & Canvas Export Module
 * Generates editorial image cards with copyright stamps and triggers native share sheets.
 */

export async function sharePoem(poem, triggerBtn = null) {
  if (!poem) return;

  const originalContent = triggerBtn ? triggerBtn.innerHTML : null;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.style.opacity = '0.7';
    triggerBtn.classList.add('loading');
  }

  try {
    const file = await createPoemShareFile(poem);
    // When sharing a file, only include files (and title) to avoid double-attachments in WhatsApp/iMessage
    const shareData = {
      title: `${poem.title} — Milobiwan`,
      files: [file]
    };

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
      showShareToast('Gedeeld', 'Het beeld is succesvol gedeeld.');
    } else if (navigator.share) {
      try {
        await navigator.share({ title: poem.title, url: window.location.href });
        triggerFileDownload(file);
      } catch (err) {
        if (err.name !== 'AbortError') fallbackShare(file);
      }
    } else {
      fallbackShare(file);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Fout bij delen van gedicht:', error);
      showShareToast('Delen niet gelukt', 'Er is een fout opgetreden bij het genereren.');
    }
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.style.opacity = '1';
      triggerBtn.classList.remove('loading');
      if (originalContent) triggerBtn.innerHTML = originalContent;
    }
  }
}

async function createPoemShareFile(poem) {
  const canvas = document.createElement('canvas');
  if (poem.imageUrl) {
    await renderImageWithCopyright(canvas, poem);
  } else {
    renderTextQuoteCard(canvas, poem);
  }
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png', 0.95));
  const filename = `${slugify(poem.title || 'gedicht')}-milobiwan.png`;
  return new File([blob], filename, { type: 'image/png' });
}

function renderImageWithCopyright(canvas, poem) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const bannerHeight = Math.max(72, Math.round(img.height * 0.09));
      canvas.width = img.width;
      canvas.height = img.height + bannerHeight;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0c0c0c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Clean footer banner
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, img.height, canvas.width, bannerHeight);

      // Copyright Text (prominent on the right)
      const fontSize = Math.max(18, Math.round(bannerHeight * 0.38));
      ctx.font = `500 ${fontSize}px "Fraunces", Georgia, serif`;
      ctx.fillStyle = '#d9822b';
      ctx.textBaseline = 'middle';

      const rightText = '© MILOBIWAN';
      const rightMetrics = ctx.measureText(rightText);
      ctx.fillText(rightText, canvas.width - rightMetrics.width - 32, img.height + (bannerHeight / 2));
      resolve();
    };
    img.onerror = () => {
      renderTextQuoteCard(canvas, poem);
      resolve();
    };
    img.src = poem.imageUrl;
  });
}

function renderTextQuoteCard(canvas, poem) {
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Rich dark background gradient
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 900);
  bgGrad.addColorStop(0, '#1c130d');
  bgGrad.addColorStop(1, '#090909');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const paddingX = 96;
  const maxContentWidth = width - (paddingX * 2);

  // Split lines & measure layout
  const rawLines = (poem.fullText || '').split('\n').map(l => l.trim()).filter(Boolean);
  const isShortPoem = rawLines.length <= 8;
  const poemFontSize = isShortPoem ? 36 : (rawLines.length <= 12 ? 32 : 28);
  const poemLineHeight = isShortPoem ? 58 : (rawLines.length <= 12 ? 50 : 44);

  // Measure title
  ctx.font = '600 62px "Fraunces", Georgia, serif';
  const titleLines = wrapText(ctx, poem.title || 'Zonder titel', maxContentWidth);
  const titleBlockHeight = (titleLines.length * 72) + 36;

  // Measure body
  ctx.font = `400 ${poemFontSize}px "Fraunces", Georgia, serif`;
  const wrappedPoemLines = [];
  rawLines.forEach(line => {
    const wrapped = wrapText(ctx, line, maxContentWidth);
    wrappedPoemLines.push(...wrapped);
  });

  const bodyBlockHeight = wrappedPoemLines.length * poemLineHeight;
  const totalContentHeight = titleBlockHeight + bodyBlockHeight + 120; // 120 footer buffer

  // Calculate dynamic start Y (vertically centered or balanced)
  let startY = Math.max(120, Math.round((height - totalContentHeight) / 2));

  // Render Title
  ctx.font = '600 62px "Fraunces", Georgia, serif';
  ctx.fillStyle = '#f5f5f5';
  ctx.textBaseline = 'top';
  titleLines.forEach(line => {
    ctx.fillText(line, paddingX, startY);
    startY += 72;
  });

  // Subtle terracotta accent bar
  startY += 12;
  ctx.strokeStyle = '#d9822b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(paddingX, startY);
  ctx.lineTo(paddingX + 90, startY);
  ctx.stroke();
  startY += 48;

  // Render Poem Lines (no line numbers, clear & spacious)
  ctx.font = `400 ${poemFontSize}px "Fraunces", Georgia, serif`;
  ctx.fillStyle = '#ede6de';

  const maxVisibleLines = Math.floor((height - startY - 140) / poemLineHeight);
  const linesToRender = wrappedPoemLines.slice(0, maxVisibleLines);

  linesToRender.forEach(line => {
    ctx.fillText(line, paddingX, startY);
    startY += poemLineHeight;
  });

  if (wrappedPoemLines.length > maxVisibleLines) {
    ctx.font = 'italic 24px "Fraunces", Georgia, serif';
    ctx.fillStyle = '#a3a3a3';
    ctx.fillText('... (lees verder op milobiwan.nl)', paddingX, startY + 8);
  }

  // Footer Attribution (Bottom-Right, same size as text, prominent)
  const footerFontSize = poemFontSize;
  ctx.font = `600 ${footerFontSize}px "Fraunces", Georgia, serif`;
  ctx.fillStyle = '#d9822b';
  ctx.textBaseline = 'bottom';

  const copyrightText = '© MILOBIWAN';
  const copyrightMetrics = ctx.measureText(copyrightText);
  const footerX = width - paddingX - copyrightMetrics.width;
  const footerY = height - 90;

  ctx.fillText(copyrightText, footerX, footerY);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (ctx.measureText(currentLine + ' ' + word).width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function fallbackShare(file) {
  triggerFileDownload(file);
  if (navigator.clipboard?.write && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
    } catch (e) {
      // Ignore clipboard failure on unsupported contexts
    }
  }
  showShareToast('Afbeelding Opgeslagen', 'De afbeelding is gedownload en gekopieerd naar het klembord.');
}

function triggerFileDownload(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function showShareToast(title, message) {
  let toast = document.getElementById('bookingToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-notice';
    toast.id = 'bookingToast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <span style="color: var(--accent); font-weight: bold;">✓</span>
    <div>
      <strong>${title}</strong>
      <div style="font-size: 0.75rem; color: var(--text-secondary);">${message}</div>
    </div>
  `;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 4000);
}

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}
