/**
 * Milobiwan Studio – Image & Multi-Page PDF Upload & AI OCR Module
 * Compresses images / parses PDFs client-side and extracts poetry text via Gemini Vision
 */

export function setupImageOcr({ onOcrSuccess, onImageChanged }) {
  const uploadInput = document.getElementById('imageUploadInput');
  const uploadZone = document.getElementById('imageUploadZone');
  const previewBox = document.getElementById('imagePreviewBox');
  const previewImg = document.getElementById('imagePreviewThumbnail');
  const previewTitle = document.getElementById('imagePreviewTitle');
  const previewSubtitle = document.getElementById('imagePreviewSubtitle');
  const removeBtn = document.getElementById('removeImageBtn');
  const ocrStatus = document.getElementById('ocrStatusMessage');
  const ocrSpinner = document.getElementById('ocrSpinner');

  let currentImageDataUrl = '';
  let currentImagePages = [];

  if (!uploadInput || !uploadZone) return;

  uploadZone.addEventListener('click', () => uploadInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  uploadInput.addEventListener('change', () => {
    if (uploadInput.files && uploadInput.files[0]) {
      handleFile(uploadInput.files[0]);
    }
  });

  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearState();
    if (typeof onImageChanged === 'function') onImageChanged('', []);
  });

  function clearState() {
    currentImageDataUrl = '';
    currentImagePages = [];
    uploadInput.value = '';
    if (previewBox) previewBox.style.display = 'none';
    if (uploadZone) uploadZone.style.display = 'block';
    setLoading(false, '');
  }

  async function handleFile(file) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.startsWith('image/');

    if (!isPdf && !isImg) {
      alert('Kies een geldige afbeelding (JPG, PNG, WebP) of een PDF document.');
      return;
    }

    setLoading(true, isPdf ? 'PDF pagina\'s converteren en tekst uitlezen met AI...' : 'Afbeelding optimaliseren en tekst uitlezen...');

    try {
      let pages = [];
      if (isPdf) {
        pages = await renderPdfPages(file, 1400, 0.80);
      } else {
        const compressed = await compressImage(file, 1400, 0.80);
        pages = [compressed];
      }

      currentImagePages = pages;
      currentImageDataUrl = pages[0] || '';

      // Update thumbnail preview
      if (previewImg) previewImg.src = currentImageDataUrl;
      if (previewTitle) {
        previewTitle.textContent = isPdf
          ? `PDF Document Gekoppeld (${pages.length} pagina${pages.length > 1 ? '\'s' : ''})`
          : 'Origineel Beeld Gekoppeld';
      }
      if (previewSubtitle) {
        previewSubtitle.textContent = isPdf
          ? 'Alle pagina\'s worden doorlopend getoond en zijn downloadbaar'
          : 'Zichtbaar in het archief voor bezoekers';
      }
      if (previewBox) previewBox.style.display = 'flex';
      if (uploadZone) uploadZone.style.display = 'none';
      if (typeof onImageChanged === 'function') onImageChanged(currentImageDataUrl, currentImagePages);

      // Voer Gemini Vision OCR uit over alle pagina's
      const res = await fetch('/api/ocr-poem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagesBase64: pages,
          mimeType: 'image/jpeg'
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.data) {
        setLoading(false, `Tekst succesvol overgenomen uit ${pages.length > 1 ? pages.length + ' pagina\'s' : 'het document'}!`);
        if (typeof onOcrSuccess === 'function') {
          onOcrSuccess(data.data, currentImageDataUrl, currentImagePages);
        }
      } else {
        setLoading(false, 'Document gekoppeld. (Vul tekst eventueel zelf aan).');
      }
    } catch (err) {
      console.warn('OCR / PDF fout:', err);
      setLoading(false, `Document gekoppeld (${err.message || 'handmatige invoer'}).`);
    }
  }

  function setLoading(isLoading, message = '') {
    if (ocrSpinner) ocrSpinner.style.display = isLoading ? 'inline-block' : 'none';
    if (ocrStatus) {
      ocrStatus.textContent = message;
      ocrStatus.style.display = message ? 'block' : 'none';
    }
  }

  return {
    getImageData: () => currentImageDataUrl,
    getImagePages: () => currentImagePages,
    setImageData: (dataUrl, pages = []) => {
      currentImageDataUrl = dataUrl || '';
      currentImagePages = Array.isArray(pages) && pages.length > 0 ? pages : (dataUrl ? [dataUrl] : []);
      if (currentImageDataUrl) {
        if (previewImg) previewImg.src = currentImageDataUrl;
        if (previewTitle) {
          previewTitle.textContent = currentImagePages.length > 1
            ? `Document Gekoppeld (${currentImagePages.length} pagina\'s)`
            : 'Origineel Beeld Gekoppeld';
        }
        if (previewBox) previewBox.style.display = 'flex';
        if (uploadZone) uploadZone.style.display = 'none';
      } else {
        if (previewBox) previewBox.style.display = 'none';
        if (uploadZone) uploadZone.style.display = 'block';
      }
    },
    clear: clearState
  };
}

/**
 * Converteert alle pagina's van een PDF naar geoptimaliseerde JPEG data URL's via pdf.js
 */
async function renderPdfPages(file, maxDimension = 1400, quality = 0.80) {
  if (typeof window.pdfjsLib === 'undefined') {
    throw new Error('PDF.js bibliotheek is nog aan het laden.');
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageImages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    let scale = 1.5;
    if (unscaledViewport.width > 0 && unscaledViewport.height > 0) {
      const maxDim = Math.max(unscaledViewport.width, unscaledViewport.height);
      scale = Math.min(2.2, maxDimension / maxDim);
    }

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    pageImages.push(dataUrl);
  }

  return pageImages;
}

/**
 * Comprimeert een afbeelding naar client-side JPEG
 */
function compressImage(file, maxDimension = 1400, quality = 0.80) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
