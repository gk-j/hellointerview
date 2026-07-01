export default function calculateUploadStructure(fileSize:number) {
  const MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MiB absolute minimum
  const MAX_PARTS = 10000;                // Cloudflare ceiling

  // Step 1: Try using 10 MiB as a starting preference
  let chunkSize = 10 * 1024 * 1024; 

  // Step 2: Scale chunk size up if the file is too large for MAX_PARTS
  if ((fileSize / chunkSize) > MAX_PARTS) {
    chunkSize = Math.ceil(fileSize / MAX_PARTS);
  }

  // Step 3: Ensure it doesn't fall below the 5 MiB minimum limit
  chunkSize = Math.max(chunkSize, MIN_CHUNK_SIZE);

  const totalParts = Math.ceil(fileSize / chunkSize);

  return { chunkSize, totalParts };
}