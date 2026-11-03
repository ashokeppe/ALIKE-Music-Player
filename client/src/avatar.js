// Turns a chosen picture into a small square JPEG (data URL) that is cheap to store and send.
const MAX_CHARS = 110000; // the server accepts up to this much text

const loadImage = (file) =>
  new Promise((ok, fail) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); fail(new Error("That picture format isn't supported. Try a JPG, PNG or WebP.")); };
    img.src = url;
  });

export async function makeAvatar(file, size = 256) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose a picture (JPG, PNG, WebP…).");
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight); // centered square crop
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
  for (const q of [0.88, 0.75, 0.6, 0.45]) {
    const data = c.toDataURL("image/jpeg", q);
    if (data.length <= MAX_CHARS) return data;
  }
  throw new Error("That picture is too detailed. Try a different one.");
}
