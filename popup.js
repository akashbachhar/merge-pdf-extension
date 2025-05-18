let files = [];
let mergedPdfBytes = null;

const fileInput = document.getElementById('fileInput');
const mergeBtn = document.getElementById('mergeBtn');
const progress = document.getElementById('progress');
const saveBtn = document.getElementById('saveBtn');
const dropArea = document.getElementById('dropArea');
const previewGrid = document.getElementById('previewGrid');

fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
});

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.style.background = '#ffeaea';
});

dropArea.addEventListener('dragleave', () => {
  dropArea.style.background = '#fff6f6';
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.style.background = '#fff6f6';
  handleFiles(e.dataTransfer.files);
});

function handleFiles(fileList) {
  for (let file of fileList) {
    if (file.type === 'application/pdf') {
      files.push(file);
    }
  }
  renderPreviews();
  mergeBtn.style.display = files.length ? 'inline-block' : 'none';
}

let dragStartIndex = null;

async function renderPreviews() {
  previewGrid.innerHTML = '';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();

    const box = document.createElement('div');
    box.className = 'preview-box';
    box.setAttribute('draggable', true);
    box.setAttribute('data-index', i);

    // Drag events
    box.addEventListener('dragstart', (e) => {
      dragStartIndex = parseInt(box.getAttribute('data-index'));
      e.dataTransfer.effectAllowed = 'move';
    });

    box.addEventListener('dragover', (e) => {
      e.preventDefault();
      box.style.border = '2px dashed #e30000';
    });

    box.addEventListener('dragleave', () => {
      box.style.border = '';
    });

    box.addEventListener('drop', () => {
      const dropIndex = parseInt(box.getAttribute('data-index'));
      if (dragStartIndex !== null && dropIndex !== dragStartIndex) {
        const draggedFile = files[dragStartIndex];
        files.splice(dragStartIndex, 1);
        files.splice(dropIndex, 0, draggedFile);
        renderPreviews();
      }
    });

    const close = document.createElement('div');
    close.className = 'remove-icon';
    close.textContent = '✖';
    close.addEventListener('click', () => {
      files.splice(i, 1);
      renderPreviews();
      mergeBtn.style.display = files.length ? 'inline-block' : 'none';
      saveBtn.style.display = 'none';
    });

    const name = document.createElement('div');
    name.textContent = file.name;
    name.style.wordBreak = 'break-word';

    const page = document.createElement('div');
    page.className = 'page-count';
    page.textContent = `${pageCount} pages`;

    box.appendChild(close);
    box.appendChild(name);
    box.appendChild(page);
    previewGrid.appendChild(box);
  }
}

mergeBtn.addEventListener('click', async () => {
  if (files.length < 2) return alert('Add at least 2 PDF files');

  progress.style.display = 'block';

  const mergedPdf = await PDFLib.PDFDocument.create();

  for (let file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  mergedPdfBytes = await mergedPdf.save();
  progress.style.display = 'none';
  saveBtn.style.display = 'inline-block';
});

saveBtn.addEventListener('click', () => {
  const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url,
    filename: 'merged.pdf'
  });
});
