/**
 * Milobiwan Studio – Image Upload & AI OCR Module
 * Compresses images client-side and extracts poetry text via Gemini Vision
 */

export function setupImageOcr({ onOcrSuccess, onImageChanged }) {
  const uploadInput = document.getElementById('imageUploadInput');
  const uploadZone = document.getElementById('imageUploadZone');
  const previewBox = document.getElementById('imagePreviewBox');
  const previewImg = document.getElementById('imagePreviewThumbnail');
  const removeBtn = document.getElementById('removeImageBtn');
  const ocrStatus = document.getElementById('ocrStatusMessage');
  const ocrSpinner = document.getElementById('ocrSpinner');

  let currentImageDataUrl = '';

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
    currentImageDataUrl = '';
    uploadInput.value = '';
    if (previewBox) previewBox.style.display = 'none';
    if (uploadZone) uploadZone.style.display = 'block';
    if (typeof onImageChanged === 'function') onImageChanged('');
  });

  async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Kies een geldige afbeelding (JPG, PNG of WebP).');
      return;
    }

    setLoading(true, 'Afbeelding optimaliseren en tekst uitlezen met AI...');

    try {
      const compressedDataUrl = await compressImage(file, 900, 0.75);
      currentImageDataUrl = compressedDataUrl;

      // Update thumbnail preview
      if (previewImg) previewImg.src = compressedDataUrl;
      if (previewBox) previewBox.style.display = 'flex';
      if (uploadZone) uploadZone.style.display = 'none';
      if (typeof onImageChanged === 'function') onImageChanged(compressedDataUrl);

      // Voer Gemini Vision OCR uit
      const res = await fetch('/api/ocr-poem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressedDataUrl,
          mimeType: 'image/jpeg'
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.data) {
        setLoading(false, '✓ Tekst succesvol overgenomen uit afbeelding!');
        if (typeof onOcrSuccess === 'function') {
          onOcrSuccess(data.data, compressedDataUrl);
        }
      } else {
        setLoading(false, 'Afbeelding gekoppeld. (OCR kon tekst niet automatisch uitlezen, vul tekst eventueel zelf aan).');
      }
    } catch (err) {
      console.warn('OCR fout:', err);
      setLoading(false, 'Afbeelding gekoppeld.');
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
    setImageData: (dataUrl) => {
      currentImageDataUrl = dataUrl || '';
      if (currentImageDataUrl) {
        if (previewImg) previewImg.src = currentImageDataUrl;
        if (previewBox) previewBox.style.display = 'flex';
        if (uploadZone) uploadZone.style.display = 'none';
      } else {
        if (previewBox) previewBox.style.display = 'none';
        if (uploadZone) uploadZone.style.display = 'block';
      }
    },
    clear: () => {
      currentImageDataUrl = '';
      if (uploadInput) uploadInput.value = '';
      if (previewBox) previewBox.style.display = 'none';
      if (uploadZone) uploadZone.style.display = 'block';
      setLoading(false, '');
    }
  };
}

/**
 * Comprimeert een afbeelding naar client-side WebP/JPEG om opslag en laadtijd optimaal te houden
 */
function compressImage(file, maxDimension = 1200, quality = 0.82) {
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
