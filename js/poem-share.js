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
    const shareUrl = window.location.origin + window.location.pathname + `#archief`;
    const shareText = `"${poem.title}" — Milobiwan (Mieke)\n${shareUrl}`;
    const shareData = { title: `${poem.title} — Milobiwan`, text: shareText, url: shareUrl, files: [file] };

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
      showShareToast('Gedeeld', 'Het gedicht is succesvol gedeeld.');
    } else if (navigator.share) {
      try {
        await navigator.share({ title: shareData.title, text: shareData.text, url: shareData.url });
        triggerFileDownload(file);
        showShareToast('Gedeeld & Gedownload', 'Tekst gedeeld en afbeelding opgeslagen.');
      } catch (err) {
        if (err.name !== 'AbortError') fallbackShare(file, shareText);
      }
    } else {
      fallbackShare(file, shareText);
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
      const bannerHeight = Math.max(64, Math.round(img.height * 0.08));
      canvas.width = img.width;
      canvas.height = img.height + bannerHeight;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0c0c0c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Banner background
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, img.height, canvas.width, bannerHeight);

      // Subpixel divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, img.height);
      ctx.lineTo(canvas.width, img.height);
      ctx.stroke();

      // Copyright & Brand Text
      const fontSize = Math.max(14, Math.round(bannerHeight * 0.28));
      ctx.font = `500 ${fontSize}px "Space Mono", monospace`;
      ctx.fillStyle = '#d9822b';
      ctx.textBaseline = 'middle';
      ctx.fillText(`© MILOBIWAN // ${poem.title?.toUpperCase() || 'POËZIE'}`, 24, img.height + (bannerHeight / 2));

      ctx.fillStyle = '#a3a3a3';
      const rightText = 'MILOBIWAN.NL';
      const rightMetrics = ctx.measureText(rightText);
      ctx.fillText(rightText, canvas.width - rightMetrics.width - 24, img.height + (bannerHeight / 2));
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

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#1c1410');
  bgGrad.addColorStop(1, '#0c0c0c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Frames
  ctx.strokeStyle = 'rgba(217, 130, 43, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(48, 48, width - 96, height - 96);

  // Category Tag
  ctx.font = '500 18px "Space Mono", monospace';
  ctx.fillStyle = '#d9822b';
  ctx.textBaseline = 'top';
  ctx.fillText(`[ VOCAL ARCHIVE // ${poem.languageLabel?.toUpperCase() || 'SPOKEN WORD'} ]`, 70, 75);

  // Title
  ctx.font = '600 48px "Fraunces", Georgia, serif';
  ctx.fillStyle = '#f5f5f5';
  let currentY = 130;
  wrapText(ctx, poem.title || 'Zonder titel', width - 140).forEach(line => {
    ctx.fillText(line, 70, currentY);
    currentY += 56;
  });

  // Gold accent separator
  currentY += 15;
  ctx.strokeStyle = '#d9822b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, currentY);
  ctx.lineTo(150, currentY);
  ctx.stroke();
  currentY += 45;

  // Poem body text
  const lines = (poem.fullText || '').split('\n').filter(Boolean);
  const maxLines = 14;
  lines.slice(0, maxLines).forEach((line, idx) => {
    wrapText(ctx, line, width - 180).forEach(wLine => {
      if (currentY < height - 160) {
        ctx.font = '400 16px "Space Mono", monospace';
        ctx.fillStyle = '#737373';
        ctx.fillText(String(idx + 1).padStart(2, '0'), 70, currentY + 6);

        ctx.font = '400 28px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#e8e2dc';
        ctx.fillText(wLine, 110, currentY);
        currentY += 42;
      }
    });
  });

  if (lines.length > maxLines) {
    ctx.font = 'italic 20px "Fraunces", serif';
    ctx.fillStyle = '#a3a3a3';
    ctx.fillText('... lees de volledige voordracht op de website', 110, currentY + 10);
  }

  // Footer Copyright & Colophon
  const footerY = height - 100;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, footerY);
  ctx.lineTo(width - 70, footerY);
  ctx.stroke();

  ctx.font = '500 16px "Space Mono", monospace';
  ctx.fillStyle = '#d9822b';
  ctx.fillText('© MILOBIWAN', 70, footerY + 24);

  ctx.fillStyle = '#737373';
  const slogan = 'MILOBIWAN.NL // SPOKEN WORD';
  const sloganMetrics = ctx.measureText(slogan);
  ctx.fillText(slogan, width - 70 - sloganMetrics.width, footerY + 24);
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

function fallbackShare(file, shareText) {
  triggerFileDownload(file);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareText).catch(() => {});
  }
  showShareToast('Afbeelding Opgeslagen', 'De afbeelding is gedownload en de link is gekopieerd naar het klembord.');
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
